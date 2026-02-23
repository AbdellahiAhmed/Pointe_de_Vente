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

            $this->save($returnedFrom);
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
            $this->save($customer);
            $item->setCustomer($customer);
        }

        // Credit limit validation
        if(null !== $payments = $command->getPayments()){
            $totalCreditRequested = 0;
            $hasCreditPayment = false;
            foreach($payments as $paymentDto){
                $paymentEntity = $this->getRepository(Payment::class)->find($paymentDto->getType()->getId());
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
                    $openingBalance = (float) $customer->getOpeningBalance();
                    if(($outstanding + $openingBalance + $totalCreditRequested) > $creditLimit){
                        return CreateOrderCommandResult::createFromValidationErrorMessage(
                            sprintf(
                                'Limite de crédit dépassée. Limite: %.2f, Utilisé: %.2f, Demandé: %.2f.',
                                $creditLimit,
                                $outstanding + $openingBalance,
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

        foreach($command->getItems() as $itemDto){
            $orderProduct = new OrderProduct();
            $product = $this->getRepository(Product::class)->find($itemDto->getProduct()->getId());
            $orderProduct->setProduct($product);
            $orderProduct->setCostAtSale($product->getCost());
            $orderProduct->setDiscount($itemDto->getDiscount());

            // Validate discount < cost (PMP)
            $itemDiscount = (float) ($itemDto->getDiscount() ?? 0);
            $productCost = (float) ($product->getCost() ?? 0);
            if ($itemDiscount > 0 && $productCost > 0 && $itemDiscount >= $productCost) {
                return CreateOrderCommandResult::createFromValidationErrorMessage(
                    sprintf(
                        'La remise (%.2f) doit être inférieure au prix d\'achat (%.2f) pour "%s".',
                        $itemDiscount,
                        $productCost,
                        $product->getName()
                    )
                );
            }

            $orderProduct->setPrice($itemDto->getPrice());
            $orderProduct->setQuantity($itemDto->getQuantity());

            if($itemDto->getVariant() !== null) {
                $variant = $this->getRepository(ProductVariant::class)->find($itemDto->getVariant()->getId());
                $orderProduct->setVariant($variant);

                // Override costAtSale with variant-specific cost if available
                if($variant->getCost() !== null) {
                    $orderProduct->setCostAtSale($variant->getCost());
                }

                // manage variants quantity
                if($product->getManageInventory()){
                    $variant->setQuantity($variant->getQuantity() - $itemDto->getQuantity());
                    $this->save($variant);
                }
            }

            // manage product quantity
            if($product->getManageInventory()){
                $store = null;
                foreach($product->getStores() as $s){
                    if($s->getStore()->getId() === $item->getStore()->getId()){
                        $store = $s;
                        break;
                    }
                }
                if($store !== null) {
                    $store->setQuantity($store->getQuantity() - $orderProduct->getQuantity());
                    $this->save($store);
                }
            }

            if($itemDto->getTaxes()){
                foreach($itemDto->getTaxes() as $tax){
                    $t = $this->getRepository(Tax::class)->find($tax->getId());

                    $orderProduct->addTax($t);
                }
            }

            $item->addItem($orderProduct);
        }

        $orderTotal = 0;
        if(null !== $payments = $command->getPayments()){
            foreach($payments as $paymentDto){
                $payment = new OrderPayment();
                $payment->setTotal($paymentDto->getTotal());
                $payment->setType(
                    $this->getRepository(Payment::class)->find($paymentDto->getType()->getId())
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

        $this->persist($item);
        $this->flush();

        $result = new CreateOrderCommandResult();
        $result->setOrder($item);

        return $result;
    }

    public function getNewOrderId(): string
    {
        try{
            return $this->createQueryBuilder('entity')
                ->select('COALESCE(MAX(entity.orderId) + 1, 1)')
                ->getQuery()->getSingleScalarResult();
        }catch (\Exception $exception){
            return 1;
        }
    }
}
