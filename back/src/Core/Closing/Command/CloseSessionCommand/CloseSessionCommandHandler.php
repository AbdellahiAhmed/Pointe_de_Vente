<?php

namespace App\Core\Closing\Command\CloseSessionCommand;

use App\Core\Entity\EntityManager\EntityManager;
use App\Entity\Closing;
use App\Entity\Order;
use App\Entity\OrderPayment;
use App\Entity\OrderProduct;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class CloseSessionCommandHandler extends EntityManager implements CloseSessionCommandHandlerInterface
{
    /**
     * @var ValidatorInterface
     */
    private $validator;

    public function __construct(EntityManagerInterface $entityManager, ValidatorInterface $validator)
    {
        parent::__construct($entityManager);
        $this->validator = $validator;
    }

    public function handle(CloseSessionCommand $command): CloseSessionCommandResult
    {
        /** @var Closing|null $closing */
        $closing = $this->getRepository()->find($command->getId());

        if ($closing === null) {
            return CloseSessionCommandResult::createNotFound('Closing not found');
        }

        // Already closed guard
        if ($closing->getClosedAt() !== null) {
            return CloseSessionCommandResult::createAlreadyClosed();
        }

        $this->em->beginTransaction();
        try {
            // Assign sequential zReportNumber
            $maxNumber = $this->em->createQuery(
                'SELECT MAX(c.zReportNumber) FROM App\Entity\Closing c'
            )->getSingleScalarResult() ?? 0;
            $closing->setZReportNumber((int) $maxNumber + 1);

            // Set closing fields before building snapshot
            $closing->setClosedAt(new \DateTimeImmutable());
            $closing->setDateTo(new \DateTimeImmutable());

            if ($command->getClosedBy() !== null) {
                $closedBy = $this->getRepository(User::class)->find($command->getClosedBy());
                $closing->setClosedBy($closedBy);
            }

            if ($command->getClosingBalance() !== null) {
                $closing->setClosingBalance($command->getClosingBalance());
            }

            if ($command->getDenominations() !== null) {
                $closing->setDenominations($command->getDenominations());
            }

            // Build and persist immutable snapshot
            $snapshot = $this->buildSnapshot($closing);
            $closing->setZReportSnapshot($snapshot);

            // Validate
            $violations = $this->validator->validate($closing);
            if ($violations->count() > 0) {
                $this->em->rollback();
                return CloseSessionCommandResult::createFromConstraintViolations($violations);
            }

            $this->persist($closing);
            $this->flush();
            $this->em->commit();
        } catch (\Exception $e) {
            $this->em->rollback();
            throw $e;
        }

        $result = new CloseSessionCommandResult();
        $result->setClosing($closing);

        return $result;
    }

    private function buildSnapshot(Closing $closing): array
    {
        $paymentBreakdown = $this->aggregatePayments($closing);

        return [
            'zReportNumber' => $closing->getZReportNumber(),
            'generatedAt' => (new \DateTimeImmutable())->format(\DateTime::ATOM),
            'store' => [
                'name' => $closing->getStore() ? $closing->getStore()->getName() : '',
                'location' => $closing->getStore() ? ($closing->getStore()->getLocation() ?? '') : '',
            ],
            'terminal' => [
                'code' => $closing->getTerminal() ? $closing->getTerminal()->getCode() : '',
            ],
            'openedBy' => $closing->getOpenedBy() ? $closing->getOpenedBy()->getDisplayName() : '',
            'closedBy' => $closing->getClosedBy() ? $closing->getClosedBy()->getDisplayName() : '',
            'dateFrom' => $closing->getDateFrom() ? $closing->getDateFrom()->format(\DateTime::ATOM) : null,
            'dateTo' => $closing->getDateTo() ? $closing->getDateTo()->format(\DateTime::ATOM) : null,
            'sales' => $this->aggregateSales($closing),
            'paymentBreakdown' => $paymentBreakdown,
            'cashReconciliation' => $this->buildCashReconciliation($closing, $paymentBreakdown),
            'denominations' => $closing->getDenominations() ?? [],
        ];
    }

    private function aggregateSales(Closing $closing): array
    {
        $dateFrom = $closing->getDateFrom();
        $dateTo = $closing->getDateTo();
        $terminal = $closing->getTerminal();

        // Query 1: Order counts
        $qb = $this->em->createQueryBuilder();
        $qb->select(
            'COUNT(o.id) as totalOrders',
            'COALESCE(SUM(CASE WHEN o.isDeleted = false AND o.isReturned = false THEN 1 ELSE 0 END), 0) as completedOrders',
            'COALESCE(SUM(CASE WHEN o.isReturned = true THEN 1 ELSE 0 END), 0) as returnedOrders'
        )
        ->from(Order::class, 'o')
        ->where('o.createdAt >= :dateFrom')
        ->andWhere('o.createdAt <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($terminal) {
            $qb->andWhere('o.terminal = :terminal')->setParameter('terminal', $terminal);
        }

        $summary = $qb->getQuery()->getSingleResult();

        // Query 2: Revenue from OrderProduct
        $qb2 = $this->em->createQueryBuilder();
        $qb2->select(
            'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
            'COALESCE(SUM(op.discount), 0) as totalDiscounts'
        )
        ->from(OrderProduct::class, 'op')
        ->join('op.order', 'o')
        ->where('o.createdAt >= :dateFrom')
        ->andWhere('o.createdAt <= :dateTo')
        ->andWhere('o.isDeleted = false')
        ->andWhere('o.isReturned = false')
        ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
        ->setParameter('dateFrom', $dateFrom)
        ->setParameter('dateTo', $dateTo);

        if ($terminal) {
            $qb2->andWhere('o.terminal = :terminal')->setParameter('terminal', $terminal);
        }

        $revenue = $qb2->getQuery()->getSingleResult();

        $grossRevenue = (float) $revenue['grossRevenue'];
        $totalDiscounts = (float) $revenue['totalDiscounts'];
        $netRevenue = $grossRevenue - $totalDiscounts;
        $completedOrders = (int) $summary['completedOrders'];
        $avgBasket = $completedOrders > 0 ? round($netRevenue / $completedOrders, 2) : 0;

        return [
            'totalOrders' => (int) $summary['totalOrders'],
            'completedOrders' => $completedOrders,
            'returnedOrders' => (int) $summary['returnedOrders'],
            'grossRevenue' => round($grossRevenue, 2),
            'totalDiscounts' => round($totalDiscounts, 2),
            'netRevenue' => round($netRevenue, 2),
            'averageBasket' => $avgBasket,
        ];
    }

    private function aggregatePayments(Closing $closing): array
    {
        $dateFrom = $closing->getDateFrom();
        $dateTo = $closing->getDateTo();
        $terminal = $closing->getTerminal();

        $qb = $this->em->createQueryBuilder();
        $qb->select('p.name', 'p.category', 'COALESCE(SUM(opay.total), 0) as amount')
            ->from(OrderPayment::class, 'opay')
            ->join('opay.type', 'p')
            ->join('opay.order', 'o')
            ->where('o.createdAt >= :dateFrom')
            ->andWhere('o.createdAt <= :dateTo')
            ->andWhere('o.isDeleted = false')
            ->andWhere('o.isReturned = false')
            ->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
            ->groupBy('p.id', 'p.name', 'p.category')
            ->setParameter('dateFrom', $dateFrom)
            ->setParameter('dateTo', $dateTo);

        if ($terminal) {
            $qb->andWhere('o.terminal = :terminal')->setParameter('terminal', $terminal);
        }

        $rows = $qb->getQuery()->getResult();

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'name' => $row['name'],
                'category' => $row['category'],
                'amount' => round((float) $row['amount'], 2),
            ];
        }

        return $result;
    }

    private function buildCashReconciliation(Closing $closing, array $paymentBreakdown): array
    {
        $openingBalance = (float) ($closing->getOpeningBalance() ?? 0);

        // Sum cash payments from the payment breakdown
        $cashReceived = 0.0;
        foreach ($paymentBreakdown as $payment) {
            if ($payment['category'] === 'cash') {
                $cashReceived += (float) $payment['amount'];
            }
        }

        $cashAdded = (float) ($closing->getCashAdded() ?? 0);
        $cashWithdrawn = (float) ($closing->getCashWithdrawn() ?? 0);
        $expenses = (float) ($closing->getExpenses() ?? 0);
        $expectedCash = $openingBalance + $cashReceived + $cashAdded - $cashWithdrawn - $expenses;
        $countedCash = (float) ($closing->getClosingBalance() ?? 0);
        $variance = round($countedCash - $expectedCash, 2);

        return [
            'openingBalance' => round($openingBalance, 2),
            'cashReceived' => round($cashReceived, 2),
            'cashAdded' => round($cashAdded, 2),
            'cashWithdrawn' => round($cashWithdrawn, 2),
            'expenses' => round($expenses, 2),
            'expectedCash' => round($expectedCash, 2),
            'countedCash' => round($countedCash, 2),
            'variance' => $variance,
        ];
    }

    protected function getEntityClass(): string
    {
        return Closing::class;
    }
}
