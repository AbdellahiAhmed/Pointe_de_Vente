<?php

namespace App\Controller\Api\Admin;

use App\Entity\Order;
use App\Entity\OrderProduct;
use App\Entity\OrderPayment;
use App\Factory\Controller\ApiResponseFactory;
use App\Security\Voter\ReportVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/report", name="admin_reports_")
 */
class ReportController extends AbstractController
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * @Route("/sales", name="sales", methods={"GET"})
     */
    public function sales(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);
        $dateFrom = $request->query->get('dateFrom', date('Y-m-d'));
        $dateTo = $request->query->get('dateTo', date('Y-m-d'));
        $storeId = $request->query->get('store');

        $qb = $this->em->createQueryBuilder();
        $qb->select(
            'COUNT(o.id) as totalOrders',
            'COALESCE(SUM(CASE WHEN o.isDeleted = false AND o.isReturned = false THEN 1 ELSE 0 END), 0) as completedOrders',
            'COALESCE(SUM(CASE WHEN o.isReturned = true THEN 1 ELSE 0 END), 0) as returnedOrders'
        )
        ->from(Order::class, 'o')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $summary = $qb->getQuery()->getSingleResult();

        // Revenue calculation
        $qb2 = $this->em->createQueryBuilder();
        $qb2->select(
            'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb2->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $revenue = $qb2->getQuery()->getSingleResult();

        // Payment breakdown
        $qb3 = $this->em->createQueryBuilder();
        $qb3->select('p.name as paymentType', 'COALESCE(SUM(op.total), 0) as amount')
        ->from(OrderPayment::class, 'op')
        ->join('op.type', 'p')
        ->join('op.order', 'o')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->groupBy('p.name')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb3->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $payments = $qb3->getQuery()->getResult();

        $grossRevenue = (float) $revenue['grossRevenue'];
        $totalDiscounts = (float) $revenue['totalDiscounts'];
        $netRevenue = $grossRevenue - $totalDiscounts;
        $completedOrders = (int) $summary['completedOrders'];
        $avgBasket = $completedOrders > 0 ? round($netRevenue / $completedOrders, 2) : 0;

        return $responseFactory->json([
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'totalOrders' => (int) $summary['totalOrders'],
            'completedOrders' => $completedOrders,
            'returnedOrders' => (int) $summary['returnedOrders'],
            'grossRevenue' => round($grossRevenue, 2),
            'totalDiscounts' => round($totalDiscounts, 2),
            'netRevenue' => round($netRevenue, 2),
            'averageBasket' => $avgBasket,
            'payments' => $payments,
        ]);
    }

    /**
     * @Route("/profit", name="profit", methods={"GET"})
     */
    public function profit(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);
        $dateFrom = $request->query->get('dateFrom', date('Y-m-d'));
        $dateTo = $request->query->get('dateTo', date('Y-m-d'));
        $storeId = $request->query->get('store');

        // Profit = SUM((selling price - cost price) * quantity) for each order item
        $qb = $this->em->createQueryBuilder();
        $qb->select(
            'COALESCE(SUM(op.price * op.quantity), 0) as totalRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts',
            'COALESCE(SUM(COALESCE(prod.cost, 0) * op.quantity), 0) as totalCost',
            'COUNT(DISTINCT o.id) as totalOrders'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('op.product', 'prod')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $result = $qb->getQuery()->getSingleResult();

        $totalRevenue = (float) $result['totalRevenue'];
        $totalDiscounts = (float) $result['totalDiscounts'];
        $totalCost = (float) $result['totalCost'];
        $netRevenue = $totalRevenue - $totalDiscounts;
        $grossProfit = $netRevenue - $totalCost;
        $profitMargin = $netRevenue > 0 ? round(($grossProfit / $netRevenue) * 100, 2) : 0;

        // Top products by profit
        $qb2 = $this->em->createQueryBuilder();
        $qb2->select(
            'prod.name as productName',
            'SUM(op.quantity) as totalQty',
            'SUM(op.price * op.quantity) as revenue',
            'SUM(COALESCE(prod.cost, 0) * op.quantity) as cost',
            'SUM((op.price - COALESCE(prod.cost, 0)) * op.quantity) as profit'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('op.product', 'prod')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->groupBy('prod.id', 'prod.name')
        ->orderBy('profit', 'DESC')
        ->setMaxResults(10)
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb2->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $topProducts = $qb2->getQuery()->getResult();

        return $responseFactory->json([
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'totalRevenue' => round($totalRevenue, 2),
            'totalDiscounts' => round($totalDiscounts, 2),
            'netRevenue' => round($netRevenue, 2),
            'totalCost' => round($totalCost, 2),
            'grossProfit' => round($grossProfit, 2),
            'profitMargin' => $profitMargin,
            'totalOrders' => (int) $result['totalOrders'],
            'topProducts' => $topProducts,
        ]);
    }

    /**
     * @Route("/daily", name="daily", methods={"GET"})
     */
    public function daily(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);
        $date = $request->query->get('date', date('Y-m-d'));
        $storeId = $request->query->get('store');

        // Orders summary
        $qb = $this->em->createQueryBuilder();
        $qb->select(
            'COUNT(o.id) as totalOrders',
            'SUM(CASE WHEN o.isReturned = true THEN 1 ELSE 0 END) as returnedOrders'
        )
        ->from(Order::class, 'o')
        ->where('DATE(o.createdAt) = :date')
        ->andWhere('o.isDeleted = false')
        ->setParameter('date', $date);

        if ($storeId) {
            $qb->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $orderSummary = $qb->getQuery()->getSingleResult();

        // Revenue and cost
        $qb2 = $this->em->createQueryBuilder();
        $qb2->select(
            'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts',
            'COALESCE(SUM(COALESCE(prod.cost, 0) * op.quantity), 0) as totalCost'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('op.product', 'prod')
        ->where('DATE(o.createdAt) = :date')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->setParameter('date', $date);

        if ($storeId) {
            $qb2->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $revenueSummary = $qb2->getQuery()->getSingleResult();

        // Payment breakdown
        $qb3 = $this->em->createQueryBuilder();
        $qb3->select('p.name as paymentType', 'COALESCE(SUM(opay.total), 0) as amount')
        ->from(OrderPayment::class, 'opay')
        ->join('opay.type', 'p')
        ->join('opay.order', 'o')
        ->where('DATE(o.createdAt) = :date')
        ->andWhere('o.isDeleted = false')
        ->groupBy('p.name')
        ->setParameter('date', $date);

        if ($storeId) {
            $qb3->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $payments = $qb3->getQuery()->getResult();

        // Top 5 products of the day
        $qb4 = $this->em->createQueryBuilder();
        $qb4->select(
            'prod.name as productName',
            'SUM(op.quantity) as totalQty',
            'SUM(op.price * op.quantity) as revenue'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('op.product', 'prod')
        ->where('DATE(o.createdAt) = :date')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->groupBy('prod.id', 'prod.name')
        ->orderBy('totalQty', 'DESC')
        ->setMaxResults(5)
        ->setParameter('date', $date);

        if ($storeId) {
            $qb4->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $topProducts = $qb4->getQuery()->getResult();

        $grossRevenue = (float) $revenueSummary['grossRevenue'];
        $totalDiscounts = (float) $revenueSummary['totalDiscounts'];
        $totalCost = (float) $revenueSummary['totalCost'];
        $netRevenue = $grossRevenue - $totalDiscounts;
        $grossProfit = $netRevenue - $totalCost;

        return $responseFactory->json([
            'date' => $date,
            'totalOrders' => (int) $orderSummary['totalOrders'],
            'returnedOrders' => (int) $orderSummary['returnedOrders'],
            'grossRevenue' => round($grossRevenue, 2),
            'totalDiscounts' => round($totalDiscounts, 2),
            'netRevenue' => round($netRevenue, 2),
            'totalCost' => round($totalCost, 2),
            'grossProfit' => round($grossProfit, 2),
            'profitMargin' => $netRevenue > 0 ? round(($grossProfit / $netRevenue) * 100, 2) : 0,
            'payments' => $payments,
            'topProducts' => $topProducts,
        ]);
    }
}
