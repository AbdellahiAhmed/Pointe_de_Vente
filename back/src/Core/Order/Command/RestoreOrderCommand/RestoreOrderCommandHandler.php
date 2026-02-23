<?php

namespace App\Core\Order\Command\RestoreOrderCommand;

use App\Core\Entity\EntityManager\EntityManager;
use App\Entity\Order;
use App\Entity\OrderStatus;
use App\Repository\ProductStoreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class RestoreOrderCommandHandler extends EntityManager implements RestoreOrderCommandHandlerInterface
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

    public function handle(RestoreOrderCommand $command): RestoreOrderCommandResult
    {
        /** @var Order $item */
        $item = $this->getRepository()->find($command->getId());

        if ($item === null) {
            return RestoreOrderCommandResult::createNotFound();
        }

        // Re-decrement stock when restoring a deleted order
        if (!$item->getIsReturned()) {
            $store = $item->getStore();
            foreach ($item->getItems() as $orderProduct) {
                if ($orderProduct->getIsReturned()) {
                    continue;
                }
                $qty = abs((float) $orderProduct->getQuantity());
                $product = $orderProduct->getProduct();

                // Decrement ProductStore quantity
                if ($store && $product && $product->getManageInventory()) {
                    $productStore = $this->productStoreRepository->findOneBy([
                        'product' => $product,
                        'store'   => $store,
                    ]);
                    if ($productStore) {
                        $productStore->setQuantity((string) max(0, (float) $productStore->getQuantity() - $qty));
                    }
                }

                // Decrement variant quantity
                $variant = $orderProduct->getVariant();
                if ($variant !== null && $product && $product->getManageInventory()) {
                    $variant->setQuantity((string) max(0, (float) $variant->getQuantity() - $qty));
                }
            }
        }

        $item->setIsDeleted(null);
        $item->setStatus(OrderStatus::COMPLETED);

        //validate item before creation
        $violations = $this->validator->validate($item);
        if ($violations->count() > 0) {
            return RestoreOrderCommandResult::createFromConstraintViolations($violations);
        }

        $this->persist($item);
        $this->flush();

        $result = new RestoreOrderCommandResult();
        $result->setOrder($item);

        return $result;
    }
}
