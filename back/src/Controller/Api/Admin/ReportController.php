<?php

namespace App\Controller\Api\Admin;

use App\Entity\Customer;
use App\Entity\Order;
use App\Entity\OrderProduct;
use App\Entity\OrderPayment;
use App\Entity\User;
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

    private function withCache(\Symfony\Component\HttpFoundation\JsonResponse $response, int $maxAge = 300): \Symfony\Component\HttpFoundation\JsonResponse
    {
        $response->headers->set('Cache-Control', "private, max-age=$maxAge");
        return $response;
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
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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

        return $this->withCache($responseFactory->json([
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
        ]));
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
            'COALESCE(SUM(COALESCE(op.costAtSale, 0) * op.quantity), 0) as totalCost',
            'COUNT(DISTINCT o.id) as totalOrders'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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
            'SUM(COALESCE(op.costAtSale, 0) * op.quantity) as cost',
            'SUM((op.price - COALESCE(op.costAtSale, 0)) * op.quantity) as profit'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('op.product', 'prod')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->groupBy('prod.id', 'prod.name')
        ->orderBy('profit', 'DESC')
        ->setMaxResults(10)
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb2->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $topProducts = $qb2->getQuery()->getResult();

        $topProducts = array_map(function ($row) {
            $revenue = (float) $row['revenue'];
            $cost = (float) $row['cost'];
            $row['margin'] = $revenue > 0
                ? round((($revenue - $cost) / $revenue) * 100, 2)
                : 0;
            return $row;
        }, $topProducts);

        return $this->withCache($responseFactory->json([
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
        ]));
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
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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
            'COALESCE(SUM(COALESCE(op.costAtSale, 0) * op.quantity), 0) as totalCost'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->where('DATE(o.createdAt) = :date')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
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
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->groupBy('prod.id', 'prod.name')
        ->orderBy('totalQty', 'DESC')
        ->setMaxResults(5)
        ->setParameter('date', $date);

        if ($storeId) {
            $qb4->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $topProducts = $qb4->getQuery()->getResult();

        // Top 5 vendors of the day
        $qb5 = $this->em->createQueryBuilder();
        $qb5->select(
            'u.displayName as vendorName',
            'COUNT(DISTINCT o.id) as totalOrders',
            'COALESCE(SUM(op.price * op.quantity), 0) as revenue'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('o.user', 'u')
        ->where('DATE(o.createdAt) = :date')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->groupBy('u.id, u.displayName')
        ->orderBy('revenue', 'DESC')
        ->setMaxResults(5)
        ->setParameter('date', $date);

        if ($storeId) {
            $qb5->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $topVendors = $qb5->getQuery()->getResult();

        // J-1 (yesterday) comparison
        $yesterday = (new \DateTime($date))->modify('-1 day')->format('Y-m-d');

        $qb6 = $this->em->createQueryBuilder();
        $qb6->select(
            'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->where('DATE(o.createdAt) = :yesterday')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->setParameter('yesterday', $yesterday);

        if ($storeId) {
            $qb6->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $yesterdayRevenue = $qb6->getQuery()->getSingleResult();

        $qb7 = $this->em->createQueryBuilder();
        $qb7->select('COUNT(o.id) as totalOrders')
        ->from(Order::class, 'o')
        ->where('DATE(o.createdAt) = :yesterday')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->setParameter('yesterday', $yesterday);

        if ($storeId) {
            $qb7->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $yesterdayOrders = $qb7->getQuery()->getSingleResult();

        $grossRevenue = (float) $revenueSummary['grossRevenue'];
        $totalDiscounts = (float) $revenueSummary['totalDiscounts'];
        $totalCost = (float) $revenueSummary['totalCost'];
        $netRevenue = $grossRevenue - $totalDiscounts;
        $grossProfit = $netRevenue - $totalCost;

        $completedOrders = (int) $orderSummary['totalOrders'] - (int) $orderSummary['returnedOrders'];
        $avgBasket = $completedOrders > 0 ? round($netRevenue / $completedOrders, 2) : 0;

        return $this->withCache($responseFactory->json([
            'date' => $date,
            'totalOrders' => (int) $orderSummary['totalOrders'],
            'returnedOrders' => (int) $orderSummary['returnedOrders'],
            'grossRevenue' => round($grossRevenue, 2),
            'totalDiscounts' => round($totalDiscounts, 2),
            'netRevenue' => round($netRevenue, 2),
            'totalCost' => round($totalCost, 2),
            'grossProfit' => round($grossProfit, 2),
            'profitMargin' => $netRevenue > 0 ? round(($grossProfit / $netRevenue) * 100, 2) : 0,
            'averageBasket' => $avgBasket,
            'payments' => $payments,
            'topProducts' => $topProducts,
            'topVendors' => $topVendors,
            'yesterday' => [
                'date' => $yesterday,
                'grossRevenue' => round((float) $yesterdayRevenue['grossRevenue'], 2),
                'netRevenue' => round((float) $yesterdayRevenue['grossRevenue'] - (float) $yesterdayRevenue['totalDiscounts'], 2),
                'totalOrders' => (int) $yesterdayOrders['totalOrders'],
            ],
        ]));
    }

    /**
     * @Route("/vendor", name="vendor", methods={"GET"})
     */
    public function vendor(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);
        $dateFrom = $request->query->get('dateFrom', date('Y-m-d'));
        $dateTo = $request->query->get('dateTo', date('Y-m-d'));
        $storeId = $request->query->get('store');

        $qb = $this->em->createQueryBuilder();
        $qb->select(
            'u.id as vendorId',
            'u.displayName as vendorName',
            'COUNT(DISTINCT o.id) as totalOrders',
            'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('o.user', 'u')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->groupBy('u.id, u.displayName')
        ->orderBy('grossRevenue', 'DESC')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $results = $qb->getQuery()->getResult();

        $vendors = array_map(function ($row) {
            $grossRevenue = (float) $row['grossRevenue'];
            $totalDiscounts = (float) $row['totalDiscounts'];
            $netRevenue = $grossRevenue - $totalDiscounts;
            $totalOrders = (int) $row['totalOrders'];

            return [
                'vendorId' => (int) $row['vendorId'],
                'vendorName' => $row['vendorName'],
                'totalOrders' => $totalOrders,
                'grossRevenue' => round($grossRevenue, 2),
                'totalDiscounts' => round($totalDiscounts, 2),
                'netRevenue' => round($netRevenue, 2),
                'averageBasket' => $totalOrders > 0 ? round($netRevenue / $totalOrders, 2) : 0,
            ];
        }, $results);

        return $this->withCache($responseFactory->json([
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'vendors' => $vendors,
        ]));
    }

    /**
     * @Route("/category", name="category", methods={"GET"})
     */
    public function category(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);
        $dateFrom = $request->query->get('dateFrom', date('Y-m-d'));
        $dateTo = $request->query->get('dateTo', date('Y-m-d'));
        $storeId = $request->query->get('store');

        $qb = $this->em->createQueryBuilder();
        $qb->select(
            'cat.id as categoryId',
            'cat.name as categoryName',
            'COUNT(DISTINCT o.id) as totalOrders',
            'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts',
            'COALESCE(SUM(COALESCE(op.costAtSale, 0) * op.quantity), 0) as totalCost'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->join('op.product', 'prod')
        ->join('prod.categories', 'cat')
        ->where('DATE(o.createdAt) >= :dateFrom')
        ->andWhere('DATE(o.createdAt) <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->groupBy('cat.id, cat.name')
        ->orderBy('grossRevenue', 'DESC')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($storeId) {
            $qb->andWhere('o.store = :store')->setParameter('store', $storeId);
        }

        $results = $qb->getQuery()->getResult();

        $categories = array_map(function ($row) {
            $grossRevenue = (float) $row['grossRevenue'];
            $totalDiscounts = (float) $row['totalDiscounts'];
            $totalCost = (float) $row['totalCost'];
            $netRevenue = $grossRevenue - $totalDiscounts;
            $grossProfit = $netRevenue - $totalCost;

            return [
                'categoryId' => (int) $row['categoryId'],
                'categoryName' => $row['categoryName'],
                'totalOrders' => (int) $row['totalOrders'],
                'grossRevenue' => round($grossRevenue, 2),
                'totalDiscounts' => round($totalDiscounts, 2),
                'netRevenue' => round($netRevenue, 2),
                'totalCost' => round($totalCost, 2),
                'grossProfit' => round($grossProfit, 2),
                'profitMargin' => $netRevenue > 0 ? round(($grossProfit / $netRevenue) * 100, 2) : 0,
            ];
        }, $results);

        return $this->withCache($responseFactory->json([
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'categories' => $categories,
        ]));
    }

    /**
     * @Route("/customers", name="customers", methods={"GET"})
     */
    public function customers(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);

        $conn = $this->em->getConnection();

        // Single query: aggregate credit sales and payments per customer
        $sql = '
            SELECT c.id, c.name, c.phone, c.allow_credit_sale, c.credit_limit, c.opening_balance,
                COALESCE(cs.total_credit_sales, 0) AS total_sales,
                COALESCE(cp.total_paid, 0) AS total_paid
            FROM customer c
            LEFT JOIN (
                SELECT o.customer_id,
                    SUM(op.received) AS total_credit_sales
                FROM `order` o
                JOIN order_payment op ON op.order_id = o.id
                JOIN payment pt ON pt.id = op.type_id
                WHERE o.is_deleted = 0 AND o.is_returned = 0 AND o.is_suspended = 0
                    AND pt.type = :creditType
                GROUP BY o.customer_id
            ) cs ON cs.customer_id = c.id
            LEFT JOIN (
                SELECT cp2.customer_id,
                    SUM(cp2.amount) AS total_paid
                FROM customer_payment cp2
                GROUP BY cp2.customer_id
            ) cp ON cp.customer_id = c.id
            ORDER BY c.name ASC
        ';
        $rows = $conn->fetchAllAssociative($sql, ['creditType' => 'credit']);

        // Batch-load all payments in one query, grouped by customer
        $paymentsSql = '
            SELECT cp.customer_id, cp.id, cp.amount, cp.description, cp.created_at,
                pt.id AS payment_type_id, pt.name AS payment_type_name
            FROM customer_payment cp
            LEFT JOIN payment pt ON pt.id = cp.payment_type_id
            ORDER BY cp.created_at DESC
        ';
        $allPayments = $conn->fetchAllAssociative($paymentsSql);
        $paymentsByCustomer = [];
        foreach ($allPayments as $p) {
            $createdAt = $p['created_at'];
            // Convert MySQL datetime to ISO 8601 format
            if ($createdAt !== null) {
                try {
                    $createdAt = (new \DateTime($createdAt))->format('c');
                } catch (\Exception $e) {}
            }

            $paymentsByCustomer[$p['customer_id']][] = [
                'id' => (int) $p['id'],
                'amount' => (float) $p['amount'],
                'description' => $p['description'],
                'createdAt' => $createdAt,
                'paymentType' => $p['payment_type_id'] ? [
                    'id' => (int) $p['payment_type_id'],
                    'name' => $p['payment_type_name'],
                ] : null,
            ];
        }

        $data = [];
        $totalOutstanding = 0;
        $creditCustomers = 0;
        foreach ($rows as $row) {
            $openingBalance = (float) $row['opening_balance'];
            $totalSales = (float) $row['total_sales'];
            $totalPaid = (float) $row['total_paid'];
            $outstanding = $openingBalance + $totalSales - $totalPaid;
            $totalOutstanding += $outstanding;
            if ($row['allow_credit_sale']) {
                $creditCustomers++;
            }

            $data[] = [
                'id' => (int) $row['id'],
                '@id' => '/api/customers/' . $row['id'],
                'name' => $row['name'],
                'phone' => $row['phone'],
                'allowCreditSale' => (bool) $row['allow_credit_sale'],
                'creditLimit' => (float) $row['credit_limit'],
                'totalSales' => $totalSales,
                'totalPayments' => $totalPaid,
                'openingBalance' => $openingBalance,
                'outstanding' => round($outstanding, 2),
                'payments' => $paymentsByCustomer[(int) $row['id']] ?? [],
            ];
        }

        return $responseFactory->json([
            'customers' => $data,
            'totalOutstanding' => round($totalOutstanding, 2),
            'totalCustomers' => count($data),
            'creditCustomers' => $creditCustomers,
        ]);
    }
}
