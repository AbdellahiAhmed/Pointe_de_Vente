<?php

namespace App\Core\Order\Command\DeleteOrderCommand;

use App\Core\Entity\EntityManager\EntityManager;
use App\Entity\Order;
use App\Entity\OrderStatus;
use App\Entity\StockMovement;
use App\Repository\ProductStoreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class DeleteOrderCommandHandler extends EntityManager implements DeleteOrderCommandHandlerInterface
{
    protected function getEntityClass(): string
    {
        return Order::class;
    }

    private $validator;
    private $productStoreRepository;

    public function __construct(
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        ProductStoreRepository $productStoreRepository
    )
    {
        parent::__construct($entityManager);
        $this->validator = $validator;
        $this->productStoreRepository = $productStoreRepository;
    }

    public function handle(DeleteOrderCommand $command): DeleteOrderCommandResult
    {
        /** @var Order $item */
        $item = $this->getRepository()->find($command->getId());

        if ($item === null) {
            return DeleteOrderCommandResult::createNotFound();
        }

        // Restore stock for non-returned, non-suspended orders
        if (!$item->getIsReturned() && !$item->getIsSuspended()) {
            $store = $item->getStore();
            foreach ($item->getItems() as $orderProduct) {
                if ($orderProduct->getIsReturned()) {
                    continue;
                }
                $qty = abs((float) $orderProduct->getQuantity());
                $product = $orderProduct->getProduct();

                // Restore ProductStore quantity
                if ($store && $product && $product->getManageInventory()) {
                    $productStore = $this->productStoreRepository->findOneBy([
                        'product' => $product,
                        'store'   => $store,
                    ]);
                    if ($productStore) {
                        $qtyBefore = (float) $productStore->getQuantity();
                        $qtyAfter = $qtyBefore + $qty;
                        $productStore->setQuantity((string) $qtyAfter);

                        $movement = new StockMovement();
                        $movement->setProduct($product);
                        $movement->setProductStore($productStore);
                        $movement->setStore($store);
                        $movement->setQuantityBefore((string) $qtyBefore);
                        $movement->setQuantityAfter((string) $qtyAfter);
                        $movement->setQuantityChanged((string) $qty);
                        $movement->setType(StockMovement::TYPE_RETURN);
                        $movement->setReference($item->getOrderId());
                        $movement->setReason('Order deleted');
                        $movement->setUser($item->getUser());
                        $this->em->persist($movement);
                    }
                }

                // Restore variant quantity
                $variant = $orderProduct->getVariant();
                if ($variant !== null && $product && $product->getManageInventory()) {
                    $variant->setQuantity((string) ((float) $variant->getQuantity() + $qty));
                }
            }
        }

        $item->setIsDeleted(true);
        $item->setStatus(OrderStatus::DELETED);

        //validate item before creation
        $violations = $this->validator->validate($item);
        if ($violations->count() > 0) {
            return DeleteOrderCommandResult::createFromConstraintViolations($violations);
        }

        //completely remove if order is suspended
        if($item->getIsSuspended()){
            $this->remove($item);
        }else{
            $this->persist($item);
        }

        $this->flush();

        $result = new DeleteOrderCommandResult();
        $result->setOrder($item);

        return $result;
    }
}
