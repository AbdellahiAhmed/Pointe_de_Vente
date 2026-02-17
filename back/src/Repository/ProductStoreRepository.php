<?php

namespace App\Repository;

use App\Entity\ProductStore;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method ProductStore|null find($id, $lockMode = null, $lockVersion = null)
 * @method ProductStore|null findOneBy(array $criteria, array $orderBy = null)
 * @method ProductStore[]    findAll()
 * @method ProductStore[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ProductStoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProductStore::class);
    }

    /**
     * @return ProductStore[]
     */
    public function findBelowReorderLevel(?int $storeId = null): array
    {
        $qb = $this->createQueryBuilder('ps')
            ->join('ps.product', 'p')
            ->join('ps.store', 's')
            ->addSelect('p', 's')
            ->andWhere('p.manageInventory = true')
            ->andWhere('ps.quantity < COALESCE(ps.reOrderLevel, 10)')
            ->orderBy('ps.quantity', 'ASC');

        if ($storeId !== null) {
            $qb->andWhere('s.id = :store')
               ->setParameter('store', $storeId);
        }

        return $qb->getQuery()->getResult();
    }
}
