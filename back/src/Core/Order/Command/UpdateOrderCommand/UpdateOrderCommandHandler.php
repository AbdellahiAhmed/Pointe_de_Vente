<?php

namespace App\Core\Order\Command\UpdateOrderCommand;

use App\Entity\Customer;
use App\Entity\Discount;
use App\Entity\OrderDiscount;
use App\Entity\OrderPayment;
use App\Entity\OrderTax;
use App\Entity\Payment;
use App\Entity\Tax;
use Doctrine\ORM\EntityManagerInterface;
use App\Core\Entity\EntityManager\EntityManager;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use App\Entity\Order;

class UpdateOrderCommandHandler extends EntityManager implements UpdateOrderCommandHandlerInterface
{
    protected function getEntityClass(): string
    {
        return Order::class;
    }

    private ValidatorInterface $validator;

    public function __construct(
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    )
    {
        parent::__construct($entityManager);
        $this->validator = $validator;
    }

    public function handle(UpdateOrderCommand $command): UpdateOrderCommandResult
    {
        /** @var Order $item */
        $item = $this->getRepository()->find($command->getId());

        if($item === null){
            return UpdateOrderCommandResult::createNotFound();
        }
        if($command->getCustomerId() !== null) {
            $customer = $this->getRepository(Customer::class)->find($command->getCustomerId());
            if($customer !== null) {
                $item->setCustomer($customer);
            }
        }

        if($command->getCustomer() !== null){
            $customer = new Customer();
            $customer->setName($command->getCustomer());
            $customer->setOpeningBalance(0);
            $this->persist($customer);
            $item->setCustomer($customer);
        }

        if($command->getStatus() !== null){
            $item->setStatus($command->getStatus());
        }

        if($command->getDescription() !== null){
            $item->setDescription($command->getDescription());
        }

        if($command->getAdjustment() !== null){
            $item->setAdjustment($command->getAdjustment());
        }

        if(null !== $payments = $command->getPayments()){
            // Credit limit validation (mirrors CreateOrderCommandHandler logic)
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
                    return UpdateOrderCommandResult::createFromValidationErrorMessage(
                        'This customer is not authorized to buy on credit.'
                    );
                }
                $creditLimit = (float) $customer->getCreditLimit();
                if($creditLimit > 0){
                    // Subtract previous credit from outstanding (we're replacing payments)
                    $prevCreditTotal = 0;
                    $prevPayments = $this->getRepository(OrderPayment::class)->findBy(['order' => $item]);
                    foreach($prevPayments as $pp){
                        if($pp->getType() !== null && $pp->getType()->getType() === Payment::PAYMENT_TYPE_CREDIT){
                            $prevCreditTotal += (float) $pp->getReceived();
                        }
                    }
                    $outstanding = $customer->getOutstanding() - $prevCreditTotal;
                    if(($outstanding + $totalCreditRequested) > $creditLimit){
                        return UpdateOrderCommandResult::createFromValidationErrorMessage(
                            sprintf(
                                'Credit limit exceeded. Limit: %.2f, Used: %.2f, Requested: %.2f.',
                                $creditLimit,
                                $outstanding,
                                $totalCreditRequested
                            )
                        );
                    }
                }
            }

            // delete previous payments
            $prevPayments = $this->getRepository(OrderPayment::class)->findBy([
                'order' => $item
            ]);
            $this->removeAll($prevPayments);

            foreach($payments as $paymentDto){
                $paymentType = $this->getRepository(Payment::class)->find($paymentDto->getType()->getId());
                if($paymentType === null){
                    continue;
                }
                $payment = new OrderPayment();
                $payment->setTotal($paymentDto->getTotal());
                $payment->setType($paymentType);
                $payment->setDue($paymentDto->getDue());
                $payment->setReceived($paymentDto->getReceived());

                $item->addPayment($payment);
            }
        }

        if(null !== $command->getDiscount()){
            // delete previous discount
            $prevDiscount = $this->getRepository(OrderDiscount::class)->findOneBy([
                'order' => $item
            ]);
            if($prevDiscount !== null){
                $this->remove($prevDiscount);
            }

            /** @var Discount $discount */
            $discount = $this->getRepository(Discount::class)->find($command->getDiscount()->getId());
            if($discount === null){
                return UpdateOrderCommandResult::createFromValidationErrorMessage('Discount type not found.');
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
            $prevTax = $this->getRepository(OrderTax::class)->findOneBy([
                'order' => $item
            ]);
            if($prevTax !== null){
                $this->remove($prevTax);
            }

            /** @var Tax $tax */
            $tax = $this->getRepository(Tax::class)->find($command->getTax()->getId());
            if($tax === null){
                return UpdateOrderCommandResult::createFromValidationErrorMessage('Tax type not found.');
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
        if($violations->count() > 0){
            return UpdateOrderCommandResult::createFromConstraintViolations($violations);
        }

        $this->persist($item);
        $this->flush();

        $result = new UpdateOrderCommandResult();
        $result->setOrder($item);

        return $result;
    }
}
