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
            $item->setReturnedFrom($returnedFrom);

            $returnedFrom->setIsReturned(true);
            $returnedFrom->setStatus(OrderStatus::RETURNED);
            // No flush here — will be flushed at the end
        }
        $item->setIsSuspended($command->getIsSuspended());
        $item->setIsDeleted($command->getIsDeleted());
        $item->setIsReturned($command->getIsReturned());
        $item->setIsDispatched($command->getIsDispatched());
        if($command->getCustomerId() !== null) {
            $item->setCustomer(
                $this->getRepository(Customer::class)->find($command->getCustomerId())
            );
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

        $item->setUser(
          $this->getRepository(User::class)->find($command->getUserId())
        );

        $item->setStore($this->getRepository(Store::class)->find($command->getStore()));
        $item->setTerminal($this->getRepository(Terminal::class)->find($command->getTerminal()));

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
                $store = null;
                foreach($product->getStores() as $s){
                    if($s->getStore()->getId() === $item->getStore()->getId()){
                        $store = $s;
                        break;
                    }
                }
                if($store !== null) {
                    $store->setQuantity((string)max(0, (float)$store->getQuantity() - (float)$orderProduct->getQuantity()));
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
                $payment = new OrderPayment();
                $payment->setTotal($paymentDto->getTotal());
                $payment->setType(
                    $paymentTypeMap[$paymentDto->getType()->getId()] ?? null
                );
                $payment->setDue($paymentDto->getDue());
                $payment->setReceived($paymentDto->getReceived());

                $orderTotal += $paymentDto->getTotal();

                $item->addPayment($payment);
            }
        }

        if(null !== $command->getDiscount()){
            /** @var Discount $discount */
            $discount = $this->getRepository(Discount::class)->find($command->getDiscount()->getId());

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
            /** @var Tax $tax */
            $tax = $this->getRepository(Tax::class)->find($command->getTax()->getId());
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
