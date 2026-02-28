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

        // Helper: build anomaly with messageKey + params for frontend translation
        $a = function(string $id, string $severity, string $category, string $title, string $messageKey, array $messageParams, int $entityId, string $entityType) use (&$anomalies) {
            $anomalies[] = [
                'id' => $id,
                'severity' => $severity,
                'category' => $category,
                'title' => $title,
                'messageKey' => $messageKey,
                'messageParams' => $messageParams,
                'entityId' => $entityId,
                'entityType' => $entityType,
            ];
        };

        // Check 1: Products with absurd cost or price (> 1,000,000 MRU)
        $threshold = 1000000;
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, cost, base_price FROM product WHERE (cost > :t OR base_price > :t) AND is_active = 1 AND deleted_at IS NULL',
            ['t' => $threshold]
        );
        foreach ($rows as $row) {
            $a('product-absurd-price-' . $row['id'], 'critical', 'Product', $row['name'],
                'health.absurd_price', ['cost' => number_format((float)$row['cost'], 2), 'price' => number_format((float)$row['base_price'], 2)],
                (int)$row['id'], 'product');
        }

        // Check 2: Products with sale price < cost (negative margin)
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, cost, base_price FROM product WHERE cost > 0 AND base_price > 0 AND base_price < cost AND is_active = 1 AND deleted_at IS NULL'
        );
        foreach ($rows as $row) {
            $a('product-negative-margin-' . $row['id'], 'warning', 'Product', $row['name'],
                'health.negative_margin', ['salePrice' => number_format((float)$row['base_price'], 2), 'cost' => number_format((float)$row['cost'], 2)],
                (int)$row['id'], 'product');
        }

        // Check 3: Active products with zero or null cost
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, cost FROM product WHERE (cost IS NULL OR cost = 0) AND is_active = 1 AND deleted_at IS NULL'
        );
        foreach ($rows as $row) {
            $a('product-zero-cost-' . $row['id'], 'info', 'Product', $row['name'],
                'health.zero_cost', [],
                (int)$row['id'], 'product');
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
            $a('order-absurd-cost-' . $row['id'], 'critical', 'Order', sprintf('#%s — %s', $row['order_id'], $row['name']),
                'health.absurd_cost_at_sale', ['cost' => number_format((float)$row['cost_at_sale'], 2)],
                (int)$row['id'], 'order_product');
        }

        // Check 5: Products with negative stock
        $rows = $conn->fetchAllAssociative(
            'SELECT p.id, p.name, ps.quantity, s.name as store_name
             FROM product p
             JOIN product_store ps ON ps.product_id = p.id
             JOIN store s ON s.id = ps.store_id
             WHERE ps.quantity < 0 AND p.is_active = 1 AND p.deleted_at IS NULL'
        );
        foreach ($rows as $row) {
            $a('product-negative-stock-' . $row['id'] . '-' . md5($row['store_name']), 'warning', 'Stock', $row['name'],
                'health.negative_stock', ['qty' => number_format((float)$row['quantity'], 2), 'store' => $row['store_name']],
                (int)$row['id'], 'product');
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
                $a('customer-over-limit-' . $row['id'], 'warning', 'Customer', $row['name'],
                    'health.credit_exceeded', ['outstanding' => number_format($outstanding, 2), 'limit' => number_format($limit, 2)],
                    (int)$row['id'], 'customer');
            }
        }

        // Check 7: Duplicate active barcodes
        $rows = $conn->fetchAllAssociative(
            "SELECT barcode, COUNT(*) as cnt, GROUP_CONCAT(id) as ids, GROUP_CONCAT(name SEPARATOR ' | ') as names
             FROM product
             WHERE barcode IS NOT NULL AND barcode != '' AND is_active = 1 AND deleted_at IS NULL
             GROUP BY barcode HAVING cnt > 1"
        );
        foreach ($rows as $row) {
            $a('product-duplicate-barcode-' . md5($row['barcode']), 'critical', 'Product',
                sprintf('%s (%d)', $row['barcode'], (int)$row['cnt']),
                'health.duplicate_barcode', ['products' => $row['names']],
                (int)explode(',', $row['ids'])[0], 'product');
        }

        // Check 8: Products active but soft-deleted
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, deleted_at FROM product WHERE deleted_at IS NOT NULL AND is_active = 1 LIMIT 50'
        );
        foreach ($rows as $row) {
            $a('product-active-deleted-' . $row['id'], 'critical', 'Product', $row['name'],
                'health.active_but_deleted', ['date' => $row['deleted_at']],
                (int)$row['id'], 'product');
        }

        // Check 9: Payment formula violations
        $rows = $conn->fetchAllAssociative(
            'SELECT op.id, op.total, op.received, op.due, o.order_id
             FROM order_payment op
             JOIN `order` o ON o.id = op.order_id
             WHERE ABS((op.received + op.due) - op.total) > 0.01
             AND o.is_deleted = 0
             LIMIT 50'
        );
        foreach ($rows as $row) {
            $a('payment-formula-' . $row['id'], 'critical', 'Payment', sprintf('#%s', $row['order_id']),
                'health.payment_mismatch', [
                    'total' => number_format((float)$row['total'], 2),
                    'received' => number_format((float)$row['received'], 2),
                    'due' => number_format((float)$row['due'], 2),
                ],
                (int)$row['id'], 'order_payment');
        }

        // Check 10: Products with min_price > base_price
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, min_price, base_price FROM product
             WHERE min_price IS NOT NULL AND min_price > 0 AND base_price > 0
             AND min_price > base_price AND is_active = 1 AND deleted_at IS NULL'
        );
        foreach ($rows as $row) {
            $a('product-min-exceeds-base-' . $row['id'], 'warning', 'Product', $row['name'],
                'health.min_exceeds_price', ['minPrice' => number_format((float)$row['min_price'], 2), 'salePrice' => number_format((float)$row['base_price'], 2)],
                (int)$row['id'], 'product');
        }

        // Check 11: Active products with zero sale price
        $rows = $conn->fetchAllAssociative(
            'SELECT id, name, base_price FROM product
             WHERE (base_price IS NULL OR base_price = 0) AND is_active = 1
             AND (is_available IS NULL OR is_available = 1) AND deleted_at IS NULL'
        );
        foreach ($rows as $row) {
            $a('product-zero-price-' . $row['id'], 'warning', 'Product', $row['name'],
                'health.zero_price', [],
                (int)$row['id'], 'product');
        }

        // Check 12: Orders with inconsistent state flags
        $rows = $conn->fetchAllAssociative(
            'SELECT id, order_id, is_deleted, is_returned, is_suspended FROM `order`
             WHERE (is_deleted = 1 AND is_returned = 1) OR (is_suspended = 1 AND is_deleted = 1)
             LIMIT 50'
        );
        foreach ($rows as $row) {
            $flags = [];
            if ($row['is_deleted']) $flags[] = 'deleted';
            if ($row['is_returned']) $flags[] = 'returned';
            if ($row['is_suspended']) $flags[] = 'suspended';
            $a('order-inconsistent-flags-' . $row['id'], 'warning', 'Order', sprintf('#%s', $row['order_id']),
                'health.order_conflict', ['flags' => implode(' + ', $flags)],
                (int)$row['id'], 'order');
        }

        // Check 13: Inventory discrepancy
        $rows = $conn->fetchAllAssociative(
            'SELECT p.id, p.name, p.quantity as master_qty, COALESCE(SUM(ps.quantity), 0) as store_total
             FROM product p
             LEFT JOIN product_store ps ON ps.product_id = p.id
             WHERE p.is_active = 1 AND p.manage_inventory = 1 AND p.deleted_at IS NULL
             GROUP BY p.id
             HAVING ABS(COALESCE(p.quantity, 0) - store_total) > 0.5
             LIMIT 50'
        );
        foreach ($rows as $row) {
            $a('product-inventory-mismatch-' . $row['id'], 'warning', 'Stock', $row['name'],
                'health.inventory_mismatch', [
                    'expected' => number_format((float)$row['master_qty'], 2),
                    'actual' => number_format((float)$row['store_total'], 2),
                    'diff' => number_format(abs((float)$row['master_qty'] - (float)$row['store_total']), 2),
                ],
                (int)$row['id'], 'product');
        }

        // Check 14: Unclosed sessions
        $rows = $conn->fetchAllAssociative(
            'SELECT c.id, c.date_from, s.name as store_name, t.code as terminal_code
             FROM closing c
             LEFT JOIN store s ON s.id = c.store_id
             LEFT JOIN terminal t ON t.id = c.terminal_id
             WHERE c.closed_at IS NULL AND c.date_from < DATE_SUB(NOW(), INTERVAL 24 HOUR)
             LIMIT 50'
        );
        foreach ($rows as $row) {
            $a('closing-unclosed-' . $row['id'], 'warning', 'Closing', sprintf('%s — %s', $row['store_name'] ?? '?', $row['terminal_code'] ?? '?'),
                'health.unclosed_session', ['date' => $row['date_from']],
                (int)$row['id'], 'closing');
        }

        // Check 15: Products without barcode
        $rows = $conn->fetchAllAssociative(
            "SELECT id, name FROM product
             WHERE (barcode IS NULL OR barcode = '') AND is_active = 1 AND deleted_at IS NULL
             LIMIT 50"
        );
        foreach ($rows as $row) {
            $a('product-no-barcode-' . $row['id'], 'info', 'Product', $row['name'],
                'health.no_barcode', [],
                (int)$row['id'], 'product');
        }

        // Check 16: Products without category
        $rows = $conn->fetchAllAssociative(
            'SELECT p.id, p.name FROM product p
             LEFT JOIN product_category pc ON pc.product_id = p.id
             WHERE pc.category_id IS NULL AND p.is_active = 1 AND p.deleted_at IS NULL
             LIMIT 50'
        );
        foreach ($rows as $row) {
            $a('product-no-category-' . $row['id'], 'info', 'Product', $row['name'],
                'health.no_category', [],
                (int)$row['id'], 'product');
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
