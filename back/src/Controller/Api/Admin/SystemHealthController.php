<?php

namespace App\Controller\Api\Admin;

use App\Factory\Controller\ApiResponseFactory;
use App\Security\Voter\ReportVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/system", name="admin_system_")
 */
class SystemHealthController extends AbstractController
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * @Route("/health", name="health", methods={"GET"})
     */
    public function health(Request $request, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ReportVoter::VIEW);

        $conn = $this->em->getConnection();
        $anomalies = [];

        // Check 1: Products with absurd cost or price (> 1,000,000 MRU)
        $threshold = 1000000;
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, cost, base_price FROM product WHERE (cost > :t OR base_price > :t) AND is_active = 1',
            ['t' => $threshold]
        );
        foreach ($rows as $row) {
            $anomalies[] = [
                'id' => 'product-absurd-price-' . $row['id'],
                'severity' => 'critical',
                'category' => 'product',
                'title' => $row['name'],
                'detail' => sprintf(
                    'Cost: %s MRU, Price: %s MRU (threshold: %s MRU)',
                    number_format((float)$row['cost'], 2),
                    number_format((float)$row['base_price'], 2),
                    number_format($threshold, 0)
                ),
                'entityId' => (int)$row['id'],
                'entityType' => 'product',
            ];
        }

        // Check 2: Products with sale price < cost (negative margin)
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, cost, base_price FROM product WHERE cost > 0 AND base_price > 0 AND base_price < cost AND is_active = 1'
        );
        foreach ($rows as $row) {
            $anomalies[] = [
                'id' => 'product-negative-margin-' . $row['id'],
                'severity' => 'warning',
                'category' => 'product',
                'title' => $row['name'],
                'detail' => sprintf(
                    'Sale price (%s) < Cost (%s) — negative margin',
                    number_format((float)$row['base_price'], 2),
                    number_format((float)$row['cost'], 2)
                ),
                'entityId' => (int)$row['id'],
                'entityType' => 'product',
            ];
        }

        // Check 3: Active products with zero or null cost
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, cost FROM product WHERE (cost IS NULL OR cost = 0) AND is_active = 1'
        );
        foreach ($rows as $row) {
            $anomalies[] = [
                'id' => 'product-zero-cost-' . $row['id'],
                'severity' => 'info',
                'category' => 'product',
                'title' => $row['name'],
                'detail' => 'Cost is 0 or not set — profit calculations will be inaccurate',
                'entityId' => (int)$row['id'],
                'entityType' => 'product',
            ];
        }

        // Check 4: OrderProducts with absurd costAtSale
        $rows = $conn->fetchAllAssociative(
            'SELECT op.id, p.name, op.cost_at_sale, op.price, o.order_id
             FROM order_product op
             JOIN product p ON p.id = op.product_id
             JOIN `order` o ON o.id = op.orderId
             WHERE op.cost_at_sale > :t AND o.is_deleted = 0
             LIMIT 50',
            ['t' => $threshold]
        );
        foreach ($rows as $row) {
            $anomalies[] = [
                'id' => 'order-absurd-cost-' . $row['id'],
                'severity' => 'critical',
                'category' => 'order',
                'title' => sprintf('Order #%s — %s', $row['order_id'], $row['name']),
                'detail' => sprintf(
                    'Cost at sale: %s MRU (threshold: %s MRU)',
                    number_format((float)$row['cost_at_sale'], 2),
                    number_format($threshold, 0)
                ),
                'entityId' => (int)$row['id'],
                'entityType' => 'order_product',
            ];
        }

        // Check 5: Products with negative stock
        $rows = $conn->fetchAllAssociative(
            'SELECT p.id, p.name, ps.quantity, s.name as store_name
             FROM product p
             JOIN product_store ps ON ps.product_id = p.id
             JOIN store s ON s.id = ps.store_id
             WHERE ps.quantity < 0 AND p.is_active = 1'
        );
        foreach ($rows as $row) {
            $anomalies[] = [
                'id' => 'product-negative-stock-' . $row['id'] . '-' . md5($row['store_name']),
                'severity' => 'warning',
                'category' => 'stock',
                'title' => $row['name'],
                'detail' => sprintf(
                    'Negative stock: %s in store "%s"',
                    number_format((float)$row['quantity'], 2),
                    $row['store_name']
                ),
                'entityId' => (int)$row['id'],
                'entityType' => 'product',
            ];
        }

        // Check 6: Customers exceeding credit limit
        $rows = $conn->fetchAllAssociative(
            'SELECT c.id, c.name, c.phone, c.credit_limit, c.opening_balance,
                    COALESCE(cs.total_credit, 0) AS total_credit,
                    COALESCE(cp.total_paid, 0) AS total_paid
             FROM customer c
             LEFT JOIN (
                 SELECT o.customer_id, SUM(op.received) AS total_credit
                 FROM `order` o
                 JOIN order_payment op ON op.order_id = o.id
                 JOIN payment pt ON pt.id = op.type_id
                 WHERE o.is_deleted = 0 AND o.is_returned = 0 AND o.is_suspended = 0
                     AND pt.type = :creditType
                 GROUP BY o.customer_id
             ) cs ON cs.customer_id = c.id
             LEFT JOIN (
                 SELECT cp2.customer_id, SUM(cp2.amount) AS total_paid
                 FROM customer_payment cp2
                 GROUP BY cp2.customer_id
             ) cp ON cp.customer_id = c.id
             WHERE c.credit_limit > 0',
            ['creditType' => 'credit']
        );
        foreach ($rows as $row) {
            $outstanding = (float)$row['opening_balance'] + (float)$row['total_credit'] - (float)$row['total_paid'];
            $limit = (float)$row['credit_limit'];
            if ($outstanding > $limit && $limit > 0) {
                $anomalies[] = [
                    'id' => 'customer-over-limit-' . $row['id'],
                    'severity' => 'warning',
                    'category' => 'customer',
                    'title' => $row['name'],
                    'detail' => sprintf(
                        'Outstanding: %s MRU exceeds limit: %s MRU',
                        number_format($outstanding, 2),
                        number_format($limit, 2)
                    ),
                    'entityId' => (int)$row['id'],
                    'entityType' => 'customer',
                ];
            }
        }

        // Build summary
        $summary = ['critical' => 0, 'warning' => 0, 'info' => 0];
        foreach ($anomalies as $a) {
            $summary[$a['severity']]++;
        }
        $summary['lastScan'] = (new \DateTime())->format('c');

        return $responseFactory->json([
            'summary' => $summary,
            'anomalies' => $anomalies,
        ]);
    }
}
