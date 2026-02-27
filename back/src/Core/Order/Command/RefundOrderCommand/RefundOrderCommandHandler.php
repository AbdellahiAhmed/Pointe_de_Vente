<?php

namespace App\Core\Order\Command\RefundOrderCommand;

use App\Core\Entity\EntityManager\EntityManager;
use App\Entity\Order;
use App\Entity\OrderStatus;
use App\Entity\ProductStore;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class RefundOrderCommandHandler extends EntityManager implements RefundOrderCommandHandlerInterface
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

    public function handle(RefundOrderCommand $command): RefundOrderCommandResult
    {
        /** @var Order $item */
        $item = $this->getRepository()->find($command->getId());

        if ($item === null) {
            return RefundOrderCommandResult::createNotFound();
        }

        $item->setStatus(OrderStatus::RETURNED);
        $item->setIsReturned(true);

        // Restore inventory for each order item
        foreach ($item->getItems() as $orderProduct) {
            $product = $orderProduct->getProduct();
            if ($product === null || !$product->getManageInventory()) {
                continue;
            }
            $returnQty = abs((float) $orderProduct->getQuantity());

            // Restore store-level stock
            $store = $item->getStore();
            if ($store !== null) {
                $productStore = $this->em->getRepository(ProductStore::class)->findOneBy([
                    'product' => $product,
                    'store' => $store,
                ]);
                if ($productStore !== null) {
                    $productStore->setQuantity(
                        (string) ((float) $productStore->getQuantity() + $returnQty)
                    );
                }
            }

            // Restore variant-level stock
            $variant = $orderProduct->getVariant();
            if ($variant !== null) {
                $variant->setQuantity(
                    (string) ((float) $variant->getQuantity() + $returnQty)
                );
            }

            $orderProduct->setIsReturned(true);
        }

        //validate item before creation
        $violations = $this->validator->validate($item);
        if ($violations->count() > 0) {
            return RefundOrderCommandResult::createFromConstraintViolations($violations);
        }

        $this->persist($item);
        $this->flush();

        $result = new RefundOrderCommandResult();
        $result->setOrder($item);

        return $result;
    }
}