<?php

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

class DatabaseMaintenanceCommand extends Command
{
    protected static $defaultName = 'app:db-maintenance';
    protected static $defaultDescription = 'Display table statistics, purge old audit logs and optionally optimize tables';

    /**
     * Tables included in statistics and OPTIMIZE TABLE.
     * The `order` table is quoted because it is a reserved SQL keyword in MariaDB.
     */
    private const TRACKED_TABLES = [
        '`order`',
        'order_product',
        'order_payment',
        'ext_log_entries',
        'product',
        'customer',
    ];

    /**
     * Tables run through OPTIMIZE TABLE (subset of TRACKED_TABLES, unquoted for the statement).
     */
    private const OPTIMIZE_TABLES = [
        'order',
        'order_product',
        'ext_log_entries',
    ];

    private Connection $connection;

    public function __construct(Connection $connection, string $name = null)
    {
        parent::__construct($name);
        $this->connection = $connection;
    }

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    protected function configure(): void
    {
        $this
            ->addOption(
                'dry-run',
                null,
                InputOption::VALUE_NONE,
                'Show statistics without deleting or optimizing anything'
            )
            ->addOption(
                'months',
                null,
                InputOption::VALUE_REQUIRED,
                'Number of months of audit log history to keep',
                6
            )
            ->addOption(
                'optimize',
                null,
                InputOption::VALUE_NONE,
                'Run OPTIMIZE TABLE on heavy tables (note: locks tables during execution)'
            );
    }

    // -------------------------------------------------------------------------
    // Entry point
    // -------------------------------------------------------------------------

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io       = new SymfonyStyle($input, $output);
        $dryRun   = (bool) $input->getOption('dry-run');
        $months   = (int)  $input->getOption('months');
        $optimize = (bool) $input->getOption('optimize');

        if ($months < 1) {
            $io->error('--months must be a positive integer (minimum: 1).');

            return Command::FAILURE;
        }

        // Resolve the actual database name from the active connection.
        $dbName = $this->connection->getDatabase();

        $io->title(sprintf('Database Maintenance — %s', $dbName));

        if ($dryRun) {
            $io->note('DRY RUN mode — no data will be modified.');
        }

        // ------------------------------------------------------------------
        // 1. Table statistics
        // ------------------------------------------------------------------
        $stats = $this->collectTableStats($dbName);
        $this->renderTableStats($io, $stats);

        // ------------------------------------------------------------------
        // 2. Audit log purge
        // ------------------------------------------------------------------
        $cutoff        = new \DateTimeImmutable(sprintf('-%d months', $months));
        $cutoffStr     = $cutoff->format('Y-m-d H:i:s');
        $auditRowCount = $this->countAuditEntries($cutoffStr);

        $io->section('Audit Log Purge');
        $io->text(sprintf(
            'Entries in <comment>ext_log_entries</comment> older than %d months (before %s): <comment>%s</comment>',
            $months,
            $cutoff->format('Y-m-d'),
            number_format($auditRowCount, 0, ',', ' ')
        ));

        $freedAuditBytes = 0;

        if ($dryRun) {
            $io->writeln(sprintf(
                ' [DRY RUN] Would purge <comment>%s</comment> audit log entries older than %d months.',
                number_format($auditRowCount, 0, ',', ' '),
                $months
            ));
        } elseif ($auditRowCount > 0) {
            // Record size before deletion so we can report freed space.
            $sizeBefore      = $this->getTableBytes($dbName, 'ext_log_entries');
            $freedAuditBytes = $this->purgeAuditLogs($io, $input, $cutoffStr, $auditRowCount);
            $sizeAfter       = $this->getTableBytes($dbName, 'ext_log_entries');
            $freedAuditBytes = max(0, $sizeBefore - $sizeAfter);
        } else {
            $io->text('Nothing to purge.');
        }

        // ------------------------------------------------------------------
        // 3. OPTIMIZE TABLE
        // ------------------------------------------------------------------
        $freedOptimizeBytes = 0;

        if ($optimize) {
            $io->section('Table Optimization');

            if ($dryRun) {
                $io->writeln(sprintf(
                    ' [DRY RUN] Would optimize %d tables: <comment>%s</comment>.',
                    count(self::OPTIMIZE_TABLES),
                    implode(', ', self::OPTIMIZE_TABLES)
                ));
            } else {
                $freedOptimizeBytes = $this->optimizeTables($io, $dbName);
            }
        } elseif (!$dryRun) {
            $io->note('Table optimization skipped. Re-run with --optimize to enable it.');
        } else {
            $io->writeln(sprintf(
                ' [DRY RUN] Would optimize %d tables: <comment>%s</comment>.',
                count(self::OPTIMIZE_TABLES),
                implode(', ', self::OPTIMIZE_TABLES)
            ));
        }

        // ------------------------------------------------------------------
        // 4. Summary
        // ------------------------------------------------------------------
        $this->renderSummary($io, $dryRun, $auditRowCount, $freedAuditBytes, $freedOptimizeBytes);

        return Command::SUCCESS;
    }

    // -------------------------------------------------------------------------
    // Statistics helpers
    // -------------------------------------------------------------------------

    /**
     * Query information_schema to get row count and total size for each tracked table.
     *
     * @return array<int, array{table: string, rows: int, size_bytes: int}>
     */
    private function collectTableStats(string $dbName): array
    {
        // Resolve plain table names (strip backtick quoting).
        $tableNames = array_map(
            static fn (string $t): string => trim($t, '`'),
            self::TRACKED_TABLES
        );

        $placeholders = implode(', ', array_fill(0, count($tableNames), '?'));

        $sql = <<<SQL
            SELECT
                TABLE_NAME                              AS tbl,
                COALESCE(TABLE_ROWS, 0)                 AS row_count,
                COALESCE(DATA_LENGTH + INDEX_LENGTH, 0) AS size_bytes
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME IN ({$placeholders})
            ORDER BY size_bytes DESC
        SQL;

        $params = array_merge([$dbName], $tableNames);

        /** @var array<array{tbl: string, row_count: int, size_bytes: int}> $rows */
        $rows = $this->connection->fetchAllAssociative($sql, $params);

        // Return in the canonical order defined by TRACKED_TABLES.
        $indexed = [];
        foreach ($rows as $row) {
            $indexed[$row['tbl']] = $row;
        }

        $result = [];
        foreach ($tableNames as $name) {
            $result[] = [
                'table'      => $name,
                'rows'       => (int) ($indexed[$name]['row_count'] ?? 0),
                'size_bytes' => (int) ($indexed[$name]['size_bytes'] ?? 0),
            ];
        }

        return $result;
    }

    /**
     * Render the statistics as a SymfonyStyle table.
     *
     * @param array<int, array{table: string, rows: int, size_bytes: int}> $stats
     */
    private function renderTableStats(SymfonyStyle $io, array $stats): void
    {
        $io->section('Table Statistics');

        $rows = [];
        foreach ($stats as $s) {
            $rows[] = [
                $s['table'],
                number_format($s['rows'], 0, ',', ' '),
                $this->formatBytes($s['size_bytes']),
            ];
        }

        $io->table(
            ['Table', 'Rows (estimate)', 'Size'],
            $rows
        );
    }

    /**
     * Return the current data + index bytes for a single table.
     */
    private function getTableBytes(string $dbName, string $tableName): int
    {
        $sql = <<<SQL
            SELECT COALESCE(DATA_LENGTH + INDEX_LENGTH, 0) AS size_bytes
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl
        SQL;

        $value = $this->connection->fetchOne($sql, ['db' => $dbName, 'tbl' => $tableName]);

        return (int) ($value ?: 0);
    }

    // -------------------------------------------------------------------------
    // Audit log purge helpers
    // -------------------------------------------------------------------------

    private function countAuditEntries(string $cutoffStr): int
    {
        $count = $this->connection->fetchOne(
            'SELECT COUNT(*) FROM ext_log_entries WHERE logged_at < :cutoff',
            ['cutoff' => $cutoffStr]
        );

        return (int) $count;
    }

    /**
     * Delete audit log entries in batches and return the approximate freed bytes.
     * Batching avoids holding a giant transaction lock on the table.
     */
    private function purgeAuditLogs(
        SymfonyStyle $io,
        InputInterface $input,
        string $cutoffStr,
        int $totalRows
    ): int {
        if (!$input->isInteractive()) {
            // Non-interactive mode — proceed without prompting.
            $confirmed = true;
        } else {
            $confirmed = $io->confirm(
                sprintf(
                    'This will permanently delete %s audit log entries. Continue?',
                    number_format($totalRows, 0, ',', ' ')
                ),
                false
            );
        }

        if (!$confirmed) {
            $io->text('Purge cancelled.');

            return 0;
        }

        $batchSize = 5000;
        $deleted   = 0;

        $progressBar = new ProgressBar($io, $totalRows);
        $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% — elapsed: %elapsed%');
        $progressBar->start();

        do {
            $count = $this->connection->executeStatement(
                'DELETE FROM ext_log_entries WHERE logged_at < :cutoff ORDER BY id LIMIT :limit',
                ['cutoff' => $cutoffStr, 'limit' => $batchSize],
                ['limit' => \Doctrine\DBAL\ParameterType::INTEGER]
            );

            $deleted += $count;
            $progressBar->advance($count);
        } while ($count === $batchSize);

        $progressBar->finish();
        $io->newLine(2);

        $io->success(sprintf('Purged %s audit log entries.', number_format($deleted, 0, ',', ' ')));

        return $deleted;
    }

    // -------------------------------------------------------------------------
    // OPTIMIZE TABLE helpers
    // -------------------------------------------------------------------------

    /**
     * Run OPTIMIZE TABLE sequentially and report per-table feedback.
     * Returns the approximate total freed bytes (best-effort from information_schema).
     */
    private function optimizeTables(SymfonyStyle $io, string $dbName): int
    {
        $totalFreed = 0;

        foreach (self::OPTIMIZE_TABLES as $table) {
            $sizeBefore = $this->getTableBytes($dbName, $table);

            $io->text(sprintf('Optimizing <comment>%s</comment>...', $table));

            // OPTIMIZE TABLE returns a result set with status messages.
            // We use executeQuery so the driver can handle the multi-row response.
            $stmt   = $this->connection->executeQuery(sprintf('OPTIMIZE TABLE `%s`', $table));
            $result = $stmt->fetchAllAssociative();

            $sizeAfter  = $this->getTableBytes($dbName, $table);
            $freed      = max(0, $sizeBefore - $sizeAfter);
            $totalFreed += $freed;

            // Surface any warnings returned by MariaDB (e.g. "Table does not support optimize").
            foreach ($result as $row) {
                $msgType = strtolower($row['Msg_type'] ?? '');
                $msgText = $row['Msg_text'] ?? '';

                if ($msgType === 'error') {
                    $io->warning(sprintf('  [%s] %s', $table, $msgText));
                } elseif ($msgType === 'note') {
                    $io->text(sprintf('  Note: %s', $msgText));
                }
            }

            $io->text(sprintf(
                '  Done — freed approx. <info>%s</info>.',
                $this->formatBytes($freed)
            ));
        }

        return $totalFreed;
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------

    private function renderSummary(
        SymfonyStyle $io,
        bool $dryRun,
        int $auditRowsAffected,
        int $freedAuditBytes,
        int $freedOptimizeBytes
    ): void {
        $io->section('Summary');

        $prefix = $dryRun ? '[DRY RUN] ' : '';

        $summaryRows = [
            ['Audit entries affected', $prefix . number_format($auditRowsAffected, 0, ',', ' ')],
            ['Space freed by purge',   $prefix . $this->formatBytes($freedAuditBytes)],
            ['Space freed by optimize', $prefix . $this->formatBytes($freedOptimizeBytes)],
            ['Total space freed',      $prefix . $this->formatBytes($freedAuditBytes + $freedOptimizeBytes)],
        ];

        $io->table(['Metric', 'Value'], $summaryRows);

        if ($dryRun) {
            $io->note('Re-run without --dry-run to apply changes.');
        }
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    /**
     * Format a byte count as a human-readable string (B / KB / MB / GB).
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = (int) floor(log($bytes, 1024));
        $power = min($power, count($units) - 1);

        return round($bytes / (1024 ** $power), 1) . ' ' . $units[$power];
    }
}
