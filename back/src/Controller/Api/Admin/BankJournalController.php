<?php

namespace App\Controller\Api\Admin;

use App\Entity\CustomerPayment;
use App\Entity\Expense;
use App\Entity\OrderPayment;
use App\Entity\Payment;
use App\Factory\Controller\ApiResponseFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Bank Account Journal: per-payment-type inflow/outflow ledger.
 *
 * GET /api/admin/bank-journal/summary
 * GET /api/admin/bank-journal/{paymentId}/transactions
 *
 * @Route("/admin/bank-journal", name="admin_bank_journal_")
 */
class BankJournalController extends AbstractController
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Parse a nullable date string into a \DateTime.
     * Returns null when the string is empty or invalid so callers can skip
     * the filter clause gracefully.
     */
    private function parseDate(?string $value): ?\DateTime
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return new \DateTime($value);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Apply the standard date-range + store filters shared by all three
     * inflow/outflow sub-queries that operate on Order.
     *
     * @param \Doctrine\ORM\QueryBuilder $qb
     * @param string                     $dateAlias   alias for the date column  (e.g. 'o.createdAt')
     * @param \DateTime|null             $dateFrom
     * @param \DateTime|null             $dateTo
     * @param string|null                $storeId
     * @param string                     $storeAlias  alias for the store column (e.g. 'o.store')
     */
    private function applyDateAndStoreFilters(
        \Doctrine\ORM\QueryBuilder $qb,
        string $dateAlias,
        ?\DateTime $dateFrom,
        ?\DateTime $dateTo,
        ?string $storeId,
        string $storeAlias = 'o.store'
    ): void {
        if ($dateFrom !== null) {
            $qb->andWhere("$dateAlias >= :dateFrom")
               ->setParameter('dateFrom', $dateFrom);
        }

        if ($dateTo !== null) {
            // Include the entire end day by pushing the boundary to the
            // start of the next day, so '2025-01-31' covers all records
            // created on that calendar day regardless of time component.
            $endOfDay = (clone $dateTo)->modify('+1 day');
            $qb->andWhere("$dateAlias < :dateTo")
               ->setParameter('dateTo', $endOfDay);
        }

        if ($storeId !== null && $storeId !== '') {
            $qb->andWhere("$storeAlias = :store")
               ->setParameter('store', $storeId);
        }
    }

    // -------------------------------------------------------------------------
    // Standard Order validity conditions reused across multiple queries
    // -------------------------------------------------------------------------

    /**
     * Standard filters for regular (non-return) sales orders.
     */
    private function applyValidOrderConditions(\Doctrine\ORM\QueryBuilder $qb): void
    {
        $qb->andWhere('o.isDeleted = false')
           ->andWhere('o.isReturned = false')
           ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL');
    }

    /**
     * Filters for return/refund orders (money going OUT).
     */
    private function applyReturnOrderConditions(\Doctrine\ORM\QueryBuilder $qb): void
    {
        $qb->andWhere('o.isDeleted = false')
           ->andWhere('o.isReturned = true');
    }

    // -------------------------------------------------------------------------
    // Endpoint 1: Summary
    // -------------------------------------------------------------------------

    /**
     * Per-payment-type balance summary.
     *
     * Query parameters (all optional):
     *   dateFrom  string  Y-m-d
     *   dateTo    string  Y-m-d
     *   store     int     store ID
     *
     * @Route("/summary", name="summary", methods={"GET"})
     */
    public function summary(Request $request, ApiResponseFactory $responseFactory): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_MANAGER');

        $dateFrom = $this->parseDate($request->query->get('dateFrom'));
        $dateTo   = $this->parseDate($request->query->get('dateTo'));
        $storeId  = $request->query->get('store');

        // ------------------------------------------------------------------
        // 1. Load all active Payment types once
        // ------------------------------------------------------------------
        $payments = $this->em->createQueryBuilder()
            ->select('p.id, p.name, p.type, p.category')
            ->from(Payment::class, 'p')
            ->where('p.isActive = true')
            ->orderBy('p.name', 'ASC')
            ->getQuery()
            ->getResult();

        // Index by payment ID for O(1) lookup during aggregation
        $indexed = [];
        foreach ($payments as $p) {
            $indexed[(int) $p['id']] = [
                'id'       => (int) $p['id'],
                'name'     => $p['name'],
                'type'     => $p['type'],
                'category' => $p['category'],
                'totalIn'  => 0.0,
                'totalOut' => 0.0,
            ];
        }

        // ------------------------------------------------------------------
        // 2. Inflows — sales (OrderPayment.received)
        // ------------------------------------------------------------------
        $qbSales = $this->em->createQueryBuilder()
            ->select('p.id AS paymentId', 'COALESCE(SUM(op.received), 0) AS total')
            ->from(OrderPayment::class, 'op')
            ->join('op.type', 'p')
            ->join('op.order', 'o');

        $this->applyValidOrderConditions($qbSales);
        $this->applyDateAndStoreFilters($qbSales, 'o.createdAt', $dateFrom, $dateTo, $storeId);
        $qbSales->groupBy('p.id');

        foreach ($qbSales->getQuery()->getResult() as $row) {
            $id = (int) $row['paymentId'];
            if (isset($indexed[$id])) {
                $indexed[$id]['totalIn'] += (float) $row['total'];
            }
        }

        // ------------------------------------------------------------------
        // 2b. Outflows — refunds (OrderPayment on returned orders)
        // ------------------------------------------------------------------
        $qbRefunds = $this->em->createQueryBuilder()
            ->select('p.id AS paymentId', 'COALESCE(SUM(op.received), 0) AS total')
            ->from(OrderPayment::class, 'op')
            ->join('op.type', 'p')
            ->join('op.order', 'o');

        $this->applyReturnOrderConditions($qbRefunds);
        $this->applyDateAndStoreFilters($qbRefunds, 'o.createdAt', $dateFrom, $dateTo, $storeId);
        $qbRefunds->groupBy('p.id');

        foreach ($qbRefunds->getQuery()->getResult() as $row) {
            $id = (int) $row['paymentId'];
            if (isset($indexed[$id])) {
                $indexed[$id]['totalOut'] += (float) $row['total'];
            }
        }

        // ------------------------------------------------------------------
        // 3. Inflows — customer debt repayments (CustomerPayment.amount)
        // ------------------------------------------------------------------
        $qbDebt = $this->em->createQueryBuilder()
            ->select('p.id AS paymentId', 'COALESCE(SUM(cp.amount), 0) AS total')
            ->from(CustomerPayment::class, 'cp')
            ->join('cp.paymentType', 'p');

        // CustomerPayment has no store field — only apply date filters
        $this->applyDateAndStoreFilters($qbDebt, 'cp.createdAt', $dateFrom, $dateTo, null);
        $qbDebt->groupBy('p.id');

        // Note: the JOIN on 'cp.paymentType' already excludes rows where
        // paymentType IS NULL (INNER JOIN semantics in DQL).
        foreach ($qbDebt->getQuery()->getResult() as $row) {
            $id = (int) $row['paymentId'];
            if (isset($indexed[$id])) {
                $indexed[$id]['totalIn'] += (float) $row['total'];
            }
        }

        // ------------------------------------------------------------------
        // 4. Outflows — expenses (Expense.amount)
        // ------------------------------------------------------------------
        $qbExp = $this->em->createQueryBuilder()
            ->select('p.id AS paymentId', 'COALESCE(SUM(e.amount), 0) AS total')
            ->from(Expense::class, 'e')
            ->join('e.paymentType', 'p')
            ->where('e.deletedAt IS NULL');

        $this->applyDateAndStoreFilters($qbExp, 'e.createdAt', $dateFrom, $dateTo, $storeId, 'e.store');
        $qbExp->groupBy('p.id');

        foreach ($qbExp->getQuery()->getResult() as $row) {
            $id = (int) $row['paymentId'];
            if (isset($indexed[$id])) {
                $indexed[$id]['totalOut'] += (float) $row['total'];
            }
        }

        // ------------------------------------------------------------------
        // 5. Build response
        // ------------------------------------------------------------------
        $summary = array_values(array_map(static function (array $p): array {
            $totalIn  = round($p['totalIn'], 2);
            $totalOut = round($p['totalOut'], 2);

            return [
                'id'       => $p['id'],
                'name'     => $p['name'],
                'type'     => $p['type'],
                'category' => $p['category'],
                'totalIn'  => $totalIn,
                'totalOut' => $totalOut,
                'balance'  => round($totalIn - $totalOut, 2),
            ];
        }, $indexed));

        $grandTotalIn  = round(array_sum(array_column($summary, 'totalIn')), 2);
        $grandTotalOut = round(array_sum(array_column($summary, 'totalOut')), 2);

        return $responseFactory->json([
            'dateFrom'     => $request->query->get('dateFrom'),
            'dateTo'       => $request->query->get('dateTo'),
            'payments'     => $summary,
            'grandTotalIn' => $grandTotalIn,
            'grandTotalOut' => $grandTotalOut,
            'grandBalance' => round($grandTotalIn - $grandTotalOut, 2),
        ]);
    }

    // -------------------------------------------------------------------------
    // Endpoint 2: Transactions for one payment type
    // -------------------------------------------------------------------------

    /**
     * Unified transaction ledger for a single payment type.
     *
     * Returns the union of sales, debt repayments and expenses sorted by date
     * DESC with cursor-style pagination (page / limit).
     *
     * Query parameters (all optional):
     *   dateFrom  string  Y-m-d
     *   dateTo    string  Y-m-d
     *   store     int     store ID
     *   page      int     default 1
     *   limit     int     default 50
     *
     * Each item shape:
     *   { date, type, reference, description, amountIn, amountOut }
     *
     * @Route("/{paymentId}/transactions", name="transactions", methods={"GET"}, requirements={"paymentId"="\d+"})
     */
    public function transactions(int $paymentId, Request $request, ApiResponseFactory $responseFactory): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_MANAGER');

        // ------------------------------------------------------------------
        // Resolve payment entity early to return 404 on unknown ID
        // ------------------------------------------------------------------
        $payment = $this->em->find(Payment::class, $paymentId);
        if ($payment === null) {
            return $responseFactory->notFound('Payment type not found.');
        }

        $dateFrom = $this->parseDate($request->query->get('dateFrom'));
        $dateTo   = $this->parseDate($request->query->get('dateTo'));
        $storeId  = $request->query->get('store');
        $page     = max(1, (int) $request->query->get('page', 1));
        $limit    = min(200, max(1, (int) $request->query->get('limit', 50)));

        $rows = [];

        // ------------------------------------------------------------------
        // Query A: Sales (OrderPayment)
        // ------------------------------------------------------------------
        $qbSales = $this->em->createQueryBuilder()
            ->select(
                'o.createdAt AS date',
                'o.orderId   AS reference',
                'o.description AS description',
                'op.received AS amount'
            )
            ->from(OrderPayment::class, 'op')
            ->join('op.type', 'p')
            ->join('op.order', 'o')
            ->where('p.id = :paymentId')
            ->setParameter('paymentId', $paymentId);

        $this->applyValidOrderConditions($qbSales);
        $this->applyDateAndStoreFilters($qbSales, 'o.createdAt', $dateFrom, $dateTo, $storeId);

        foreach ($qbSales->getQuery()->getResult() as $row) {
            $rows[] = [
                'date'        => $row['date'] instanceof \DateTimeInterface
                                    ? $row['date']->format('Y-m-d H:i:s')
                                    : (string) $row['date'],
                'type'        => 'sale',
                'reference'   => $row['reference'] !== null ? '#' . $row['reference'] : null,
                'description' => $row['description'],
                'amountIn'    => round((float) $row['amount'], 2),
                'amountOut'   => 0.0,
            ];
        }

        // ------------------------------------------------------------------
        // Query A2: Refunds (OrderPayment on returned orders) — outflow
        // ------------------------------------------------------------------
        $qbRefunds = $this->em->createQueryBuilder()
            ->select(
                'o.createdAt AS date',
                'o.orderId   AS reference',
                'o.description AS description',
                'op.received AS amount'
            )
            ->from(OrderPayment::class, 'op')
            ->join('op.type', 'p')
            ->join('op.order', 'o')
            ->where('p.id = :paymentId')
            ->setParameter('paymentId', $paymentId);

        $this->applyReturnOrderConditions($qbRefunds);
        $this->applyDateAndStoreFilters($qbRefunds, 'o.createdAt', $dateFrom, $dateTo, $storeId);

        foreach ($qbRefunds->getQuery()->getResult() as $row) {
            $rows[] = [
                'date'        => $row['date'] instanceof \DateTimeInterface
                                    ? $row['date']->format('Y-m-d H:i:s')
                                    : (string) $row['date'],
                'type'        => 'refund',
                'reference'   => $row['reference'] !== null ? '#' . $row['reference'] : null,
                'description' => $row['description'],
                'amountIn'    => 0.0,
                'amountOut'   => round((float) $row['amount'], 2),
            ];
        }

        // ------------------------------------------------------------------
        // Query B: Customer debt repayments (CustomerPayment)
        // ------------------------------------------------------------------
        $qbDebt = $this->em->createQueryBuilder()
            ->select(
                'cp.createdAt AS date',
                'cp.id        AS reference',
                'cp.description AS description',
                'cp.amount    AS amount'
            )
            ->from(CustomerPayment::class, 'cp')
            ->join('cp.paymentType', 'p')
            ->where('p.id = :paymentId')
            ->setParameter('paymentId', $paymentId);

        // CustomerPayment has no store field — only apply date filters
        $this->applyDateAndStoreFilters($qbDebt, 'cp.createdAt', $dateFrom, $dateTo, null);

        foreach ($qbDebt->getQuery()->getResult() as $row) {
            $rows[] = [
                'date'        => $row['date'] instanceof \DateTimeInterface
                                    ? $row['date']->format('Y-m-d H:i:s')
                                    : (string) $row['date'],
                'type'        => 'debt_payment',
                'reference'   => 'CP-' . $row['reference'],
                'description' => $row['description'],
                'amountIn'    => round((float) $row['amount'], 2),
                'amountOut'   => 0.0,
            ];
        }

        // ------------------------------------------------------------------
        // Query C: Expenses
        // ------------------------------------------------------------------
        $qbExp = $this->em->createQueryBuilder()
            ->select(
                'e.createdAt  AS date',
                'e.id         AS reference',
                'e.description AS description',
                'e.amount     AS amount'
            )
            ->from(Expense::class, 'e')
            ->join('e.paymentType', 'p')
            ->where('p.id = :paymentId')
            ->andWhere('e.deletedAt IS NULL')
            ->setParameter('paymentId', $paymentId);

        $this->applyDateAndStoreFilters($qbExp, 'e.createdAt', $dateFrom, $dateTo, $storeId, 'e.store');

        foreach ($qbExp->getQuery()->getResult() as $row) {
            $rows[] = [
                'date'        => $row['date'] instanceof \DateTimeInterface
                                    ? $row['date']->format('Y-m-d H:i:s')
                                    : (string) $row['date'],
                'type'        => 'expense',
                'reference'   => 'EXP-' . $row['reference'],
                'description' => $row['description'],
                'amountIn'    => 0.0,
                'amountOut'   => round((float) $row['amount'], 2),
            ];
        }

        // ------------------------------------------------------------------
        // Sort all rows by date DESC (PHP-level merge sort — stable)
        // ------------------------------------------------------------------
        usort($rows, static function (array $a, array $b): int {
            return strcmp($b['date'], $a['date']);
        });

        // ------------------------------------------------------------------
        // Pagination
        // ------------------------------------------------------------------
        $total  = count($rows);
        $offset = ($page - 1) * $limit;
        $items  = array_slice($rows, $offset, $limit);

        return $responseFactory->json([
            'paymentId'   => $paymentId,
            'paymentName' => $payment->getName(),
            'dateFrom'    => $request->query->get('dateFrom'),
            'dateTo'      => $request->query->get('dateTo'),
            'page'        => $page,
            'limit'       => $limit,
            'total'       => $total,
            'totalPages'  => (int) ceil($total / $limit),
            'items'       => $items,
        ]);
    }
}
