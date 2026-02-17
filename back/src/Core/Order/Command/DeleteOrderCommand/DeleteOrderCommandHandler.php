<?php

namespace App\Core\Order\Command\DeleteOrderCommand;

use App\Core\Entity\EntityManager\EntityManager;
use App\Entity\Order;
use App\Entity\OrderStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class DeleteOrderCommandHandler extends EntityManager implements DeleteOrderCommandHandlerInterface
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

    public function handle(DeleteOrderCommand $command): DeleteOrderCommandResult
    {
        /** @var Order $item */
        $item = $this->getRepository()->find($command->getId());

        if ($item === null) {
            return DeleteOrderCommandResult::createNotFound();
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