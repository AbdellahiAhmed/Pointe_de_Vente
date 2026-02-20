<?php

namespace App\Repository;

use App\Entity\ReturnRequestItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method ReturnRequestItem|null find($id, $lockMode = null, $lockVersion = null)
 * @method ReturnRequestItem|null findOneBy(array $criteria, array $orderBy = null)
 * @method ReturnRequestItem[]    findAll()
 * @method ReturnRequestItem[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ReturnRequestItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ReturnRequestItem::class);
    }
}
