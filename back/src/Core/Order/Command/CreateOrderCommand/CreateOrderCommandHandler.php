<?php

namespace App\Core\Order\Command\CreateOrderCommand;

use App\Core\Dto\Common\Order\OrderDiscountDto;
use App\Core\Entity\EntityManager\EntityManager;
use App\Entity\Customer;
use App\Entity\Discount;
use App\Entity\Order;
use App\Entity\OrderDiscount;
use App\Entity\OrderPayment;
use App\Entity\OrderProduct;
use App\Entity\OrderStatus;
use App\Entity\OrderTax;
use App\Entity\Payment;
use App\Entity\Product;
use App\Entity\ProductVariant;
use App\Entity\Store;
use App\Entity\Tax;
use App\Entity\Terminal;
use App\Entity\User;
use App\Entity\Closing;
use App\Entity\StockMovement;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class CreateOrderCommandHandler extends EntityManager implements CreateOrderCommandHandlerInterface
{
    protected function getEntityClass(): string
    {
        return Order::class;
    }

    private $validator;

    public function __construct(
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    )
    {
        parent::__construct($entityManager);
        $this->validator = $validator;
    }

    public function handle(CreateOrderCommand $command): CreateOrderCommandResult
    {
        $item = new Order();

        $item->setDescription($command->getNotes());

        $item->setStatus(OrderStatus::HOLD);
        if(!$command->getIsSuspended()) {
            $item->setOrderId($this->getNewOrderId());
            $item->setStatus(OrderStatus::COMPLETED);
        }

        if($command->getStatus() !== null){
            $item->setStatus($command->getStatus());
        }

        if($command->getReturnedFrom() !== null) {
            $returnedFrom = $this->getRepository(Order::class)->find($command->getReturnedFrom());
            if ($returnedFrom === null) {
                return CreateOrderCommandResult::createFromValidationErrorMessage('Commande d\'origine introuvable pour le retour.');
            }
            $item->setReturnedFrom($returnedFrom);

            $returnedFrom->setIsReturned(true);
            $returnedFrom->setStatus(OrderStatus::RETURNED);
        }
        $item->setIsSuspended($command->getIsSuspended());
        $item->setIsDeleted($command->getIsDeleted());
        $item->setIsReturned($command->getIsReturned());
        $item->setIsDispatched($command->getIsDispatched());
        if($command->getCustomerId() !== null) {
            $customer = $this->getRepository(Customer::class)->find($command->getCustomerId());
            if ($customer === null) {
                return CreateOrderCommandResult::createFromValidationErrorMessage('Client introuvable.');
            }
            $item->setCustomer($customer);
        } elseif($command->getCustomer() !== null and trim($command->getCustomer()) !== ''){
            $customer = (new Customer())->setName($command->getCustomer());
            $customer->setOpeningBalance(0);
            $this->persist($customer);
            $item->setCustomer($customer);
        }

        // --- Batch pre-load payment types for credit validation ---
        $paymentTypeMap = [];
        if(null !== $payments = $command->getPayments()){
            $paymentTypeIds = [];
            foreach($payments as $paymentDto){
                $ptId = $paymentDto->getType()->getId();
                if(!isset($paymentTypeMap[$ptId])){
                    $paymentTypeIds[] = $ptId;
                }
            }
            if(!empty($paymentTypeIds)){
                $paymentTypes = $this->getRepository(Payment::class)->findBy(['id' => $paymentTypeIds]);
                foreach($paymentTypes as $pt){
                    $paymentTypeMap[$pt->getId()] = $pt;
                }
            }

            // Credit limit validation
            $totalCreditRequested = 0;
            $hasCreditPayment = false;
            foreach($payments as $paymentDto){
                $paymentEntity = $paymentTypeMap[$paymentDto->getType()->getId()] ?? null;
                if($paymentEntity !== null && $paymentEntity->getType() === Payment::PAYMENT_TYPE_CREDIT){
                    $totalCreditRequested += (float) $paymentDto->getReceived();
                    $hasCreditPayment = true;
                }
            }
            if($hasCreditPayment){
                $customer = $item->getCustomer();
                if($customer === null || !$customer->getAllowCreditSale()){
                    return CreateOrderCommandResult::createFromValidationErrorMessage(
                        'Ce client n\'est pas autorisé à acheter à crédit.'
                    );
                }
                $creditLimit = (float) $customer->getCreditLimit();
                if($creditLimit > 0){
                    $outstanding = $customer->getOutstanding();
                    if(($outstanding + $totalCreditRequested) > $creditLimit){
                        return CreateOrderCommandResult::createFromValidationErrorMessage(
                            sprintf(
                                'Limite de crédit dépassée. Limite: %.2f, Utilisé: %.2f, Demandé: %.2f.',
                                $creditLimit,
                                $outstanding,
                                $totalCreditRequested
                            )
                        );
                    }
                }
            }
        }

        $user = $this->getRepository(User::class)->find($command->getUserId());
        if ($user === null) {
            return CreateOrderCommandResult::createFromValidationErrorMessage('Utilisateur introuvable.');
        }
        $item->setUser($user);

        $store = $this->getRepository(Store::class)->find($command->getStore());
        if ($store === null) {
            return CreateOrderCommandResult::createFromValidationErrorMessage('Magasin introuvable.');
        }
        $item->setStore($store);

        $terminal = $this->getRepository(Terminal::class)->find($command->getTerminal());
        if ($terminal === null) {
            return CreateOrderCommandResult::createFromValidationErrorMessage('Terminal introuvable.');
        }
        $item->setTerminal($terminal);

        // Block orders if no active session is open for this store/terminal
        if (!$command->getIsSuspended()) {
            $openSession = $this->getRepository(Closing::class)->findOneBy([
                'store' => $store,
                'terminal' => $terminal,
                'closedAt' => null,
            ]);
            if ($openSession === null || $openSession->getOpeningBalance() === null) {
                return CreateOrderCommandResult::createFromValidationErrorMessage(
                    'La session est fermée. Veuillez ouvrir une nouvelle session avant de créer des commandes.'
                );
            }
        }

        $item->setAdjustment($command->getAdjustment());

        // --- Batch pre-load products and variants ---
        $commandItems = $command->getItems();
        $productIds = [];
        $variantIds = [];
        $taxIds = [];
        foreach($commandItems as $ci){
            $productIds[] = $ci->getProduct()->getId();
            if($ci->getVariant() !== null){
                $variantIds[] = $ci->getVariant()->getId();
            }
            if($ci->getTaxes()){
                foreach($ci->getTaxes() as $tax){
                    $taxIds[] = $tax->getId();
                }
            }
        }

        $productMap = [];
        if(!empty($productIds)){
            $products = $this->getRepository(Product::class)->findBy(['id' => array_unique($productIds)]);
            foreach($products as $p){ $productMap[$p->getId()] = $p; }
        }

        $variantMap = [];
        if(!empty($variantIds)){
            $variants = $this->getRepository(ProductVariant::class)->findBy(['id' => array_unique($variantIds)]);
            foreach($variants as $v){ $variantMap[$v->getId()] = $v; }
        }

        $taxMap = [];
        if(!empty($taxIds)){
            $taxes = $this->getRepository(Tax::class)->findBy(['id' => array_unique($taxIds)]);
            foreach($taxes as $t){ $taxMap[$t->getId()] = $t; }
        }

        // --- Process order items using pre-loaded maps ---
        foreach($commandItems as $itemDto){
            $orderProduct = new OrderProduct();
            $product = $productMap[$itemDto->getProduct()->getId()] ?? null;
            if($product === null){
                return CreateOrderCommandResult::createFromValidationErrorMessage(
                    'Produit introuvable.'
                );
            }
            $orderProduct->setProduct($product);
            $orderProduct->setCostAtSale($product->getCost());
            $orderProduct->setDiscount($itemDto->getDiscount());

            // Validate discount cannot exceed selling price
            $itemDiscount = (float) ($itemDto->getDiscount() ?? 0);
            $itemPrice = (float) ($itemDto->getPrice() ?? 0);
            if ($itemDiscount > 0 && $itemPrice > 0 && $itemDiscount >= $itemPrice) {
                return CreateOrderCommandResult::createFromValidationErrorMessage(
                    sprintf(
                        'La remise (%.2f) ne peut pas dépasser le prix de vente (%.2f) pour "%s".',
                        $itemDiscount,
                        $itemPrice,
                        $product->getName()
                    )
                );
            }

            // Validate min-price: selling price must not be below product/variant minimum
            $variant = null;
            if($itemDto->getVariant() !== null){
                $variant = $variantMap[$itemDto->getVariant()->getId()] ?? null;
            }
            $minPrice = ($variant !== null && $variant->getMinPrice() !== null)
                ? (float) $variant->getMinPrice()
                : (($product->getMinPrice() !== null) ? (float) $product->getMinPrice() : 0);
            if($minPrice > 0 && $itemPrice > 0 && $itemPrice < $minPrice){
                return CreateOrderCommandResult::createFromValidationErrorMessage(
                    sprintf(
                        'Le prix de vente (%.2f) est inférieur au prix minimum (%.2f) pour "%s".',
                        $itemPrice,
                        $minPrice,
                        $product->getName()
                    )
                );
            }

            $orderProduct->setPrice($itemDto->getPrice());
            $orderProduct->setQuantity($itemDto->getQuantity());

            if($itemDto->getVariant() !== null) {
                $variant = $variantMap[$itemDto->getVariant()->getId()] ?? null;
                if($variant !== null){
                    $orderProduct->setVariant($variant);

                    // Override costAtSale with variant-specific cost if available
                    if($variant->getCost() !== null) {
                        $orderProduct->setCostAtSale($variant->getCost());
                    }

                    // manage variants quantity — skip for suspended (held) orders
                    if(!$command->getIsSuspended() && $product->getManageInventory()){
                        $variant->setQuantity((string)max(0, (float)$variant->getQuantity() - (float)$itemDto->getQuantity()));
                    }
                }
            }

            // manage product quantity — skip for suspended (held) orders
            if(!$command->getIsSuspended() && $product->getManageInventory()){
                $productStore = null;
                foreach($product->getStores() as $s){
                    if($s->getStore()->getId() === $item->getStore()->getId()){
                        $productStore = $s;
                        break;
                    }
                }
                if($productStore !== null) {
                    $qtyBefore = (float) $productStore->getQuantity();
                    $qtySold = (float) $orderProduct->getQuantity();
                    $qtyAfter = max(0, $qtyBefore - $qtySold);
                    $productStore->setQuantity((string) $qtyAfter);

                    $movement = new StockMovement();
                    $movement->setProduct($product);
                    $movement->setProductStore($productStore);
                    $movement->setStore($item->getStore());
                    $movement->setQuantityBefore((string) $qtyBefore);
                    $movement->setQuantityAfter((string) $qtyAfter);
                    $movement->setQuantityChanged((string) -$qtySold);
                    $movement->setType(StockMovement::TYPE_SALE);
                    $movement->setReference($item->getOrderId());
                    $movement->setUser($user);
                    $this->em->persist($movement);
                }
            }

            if($itemDto->getTaxes()){
                foreach($itemDto->getTaxes() as $tax){
                    $t = $taxMap[$tax->getId()] ?? null;
                    if($t !== null){
                        $orderProduct->addTax($t);
                    }
                }
            }

            $item->addItem($orderProduct);
        }

        // --- Process payments using pre-loaded map ---
        $orderTotal = 0;
        if(null !== $payments = $command->getPayments()){
            foreach($payments as $paymentDto){
                $ptId = $paymentDto->getType()->getId();
                $paymentType = $paymentTypeMap[$ptId] ?? null;
                if ($paymentType === null) {
                    return CreateOrderCommandResult::createFromValidationErrorMessage(
                        'Type de paiement introuvable (ID: ' . $ptId . ').'
                    );
                }

                $received = (float) $paymentDto->getReceived();
                $total = (float) $paymentDto->getTotal();
                if ($received < 0) {
                    return CreateOrderCommandResult::createFromValidationErrorMessage(
                        'Le montant reçu ne peut pas être négatif.'
                    );
                }

                $payment = new OrderPayment();
                $payment->setTotal($total);
                $payment->setType($paymentType);
                // Recalculate due server-side: due = received - total (change to give back)
                $payment->setDue(max(0, round($received - $total, 2)));
                $payment->setReceived($received);

                $orderTotal += $total;

                $item->addPayment($payment);
            }
        }

        if(null !== $command->getDiscount()){
            $discount = $this->getRepository(Discount::class)->find($command->getDiscount()->getId());
            if ($discount === null) {
                return CreateOrderCommandResult::createFromValidationErrorMessage('Type de remise introuvable.');
            }

            $orderDiscount = new OrderDiscount();
            $orderDiscount->setAmount($command->getDiscountAmount());
            $orderDiscount->setRate($command->getDiscount()->getRate());
            $orderDiscount->setType($discount);
            $orderDiscount->setOrder($item);
            $orderDiscount->setRateType($command->getDiscountRateType());

            $this->persist($orderDiscount);

            $item->setDiscount($orderDiscount);
        }

        if(null !== $command->getTax()){
            $tax = $this->getRepository(Tax::class)->find($command->getTax()->getId());
            if ($tax === null) {
                return CreateOrderCommandResult::createFromValidationErrorMessage('Type de taxe introuvable.');
            }
            $orderTax = new OrderTax();
            $orderTax->setType($tax);
            $orderTax->setOrder($item);
            $orderTax->setRate($command->getTax()->getRate());
            $orderTax->setAmount($command->getTaxAmount());
            $this->persist($orderTax);

            $item->setTax($orderTax);
        }

        //validate item before creation
        $violations = $this->validator->validate($item);
        if ($violations->count() > 0) {
            return CreateOrderCommandResult::createFromConstraintViolations($violations);
        }

        // Single flush — all entities (order, items, stock, payments) persisted in one transaction
        $this->persist($item);
        $this->flush();

        $result = new CreateOrderCommandResult();
        $result->setOrder($item);

        return $result;
    }

    public function getNewOrderId(): string
    {
        try {
            // Use native SQL — with idx_order_order_id index this is instant
            $conn = $this->em->getConnection();
            $result = $conn->fetchOne('SELECT COALESCE(MAX(order_id), 0) + 1 FROM `order`');
            return (string) $result;
        } catch (\Exception $exception) {
            return '1';
        }
    }
}
