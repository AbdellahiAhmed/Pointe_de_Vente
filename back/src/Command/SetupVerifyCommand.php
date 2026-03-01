<?php

namespace App\Command;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

class SetupVerifyCommand extends Command
{
    protected static $defaultName = 'app:setup:verify';

    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        parent::__construct();
        $this->entityManager = $entityManager;
    }

    protected function configure(): void
    {
        $this
            ->setDescription('Verify and create all database tables')
            ->addOption('fix', null, InputOption::VALUE_NONE, 'Automatically create missing tables')
            ->addOption('reset', null, InputOption::VALUE_NONE, 'Drop all tables and recreate from scratch');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('POS Database Verification');

        $connection = $this->entityManager->getConnection();
        $schemaManager = $connection->createSchemaManager();
        $schemaTool = new SchemaTool($this->entityManager);
        $allMetadata = $this->entityManager->getMetadataFactory()->getAllMetadata();

        // Handle --reset
        if ($input->getOption('reset')) {
            $io->warning('This will DROP all tables and recreate them. All data will be lost!');
            if (!$io->confirm('Are you sure?', false)) {
                $io->info('Cancelled.');
                return Command::SUCCESS;
            }

            $io->section('Dropping all tables...');
            $schemaTool->dropSchema($allMetadata);
            $io->success('All tables dropped.');

            $io->section('Creating all tables...');
            $schemaTool->createSchema($allMetadata);
            $io->success('All tables created.');

            $this->showTableList($io, $schemaManager);
            return Command::SUCCESS;
        }

        // Get existing tables
        $existingTables = [];
        foreach ($schemaManager->listTableNames() as $table) {
            $existingTables[] = strtolower($table);
        }

        // Get expected tables from entity metadata
        $updateSql = $schemaTool->getUpdateSchemaSql($allMetadata, true);

        $io->section('Existing tables in database');
        if (empty($existingTables)) {
            $io->warning('No tables found in database!');
        } else {
            $io->listing($existingTables);
            $io->info(sprintf('%d tables found.', count($existingTables)));
        }

        // Check what's missing
        if (empty($updateSql)) {
            $io->success('Database schema is up to date. All tables exist.');
            return Command::SUCCESS;
        }

        $io->section('Schema changes needed');
        $createStatements = [];
        $alterStatements = [];
        foreach ($updateSql as $sql) {
            if (stripos($sql, 'CREATE TABLE') === 0) {
                $createStatements[] = $sql;
            } else {
                $alterStatements[] = $sql;
            }
        }

        if (!empty($createStatements)) {
            $io->text(sprintf('<error>%d missing table(s):</error>', count($createStatements)));
            foreach ($createStatements as $sql) {
                // Extract table name from CREATE TABLE statement
                if (preg_match('/CREATE TABLE\s+`?(\w+)`?/i', $sql, $m)) {
                    $io->text(sprintf('  - <comment>%s</comment>', $m[1]));
                }
            }
        }

        if (!empty($alterStatements)) {
            $io->text(sprintf('<info>%d ALTER/INDEX statement(s) needed</info>', count($alterStatements)));
        }

        $io->newLine();
        $io->text(sprintf('Total: %d SQL statement(s) to execute.', count($updateSql)));

        // Fix if requested
        if ($input->getOption('fix')) {
            $io->section('Applying schema changes...');

            $errors = 0;
            foreach ($updateSql as $sql) {
                try {
                    $connection->executeStatement($sql);
                    $io->text(sprintf('<info>[OK]</info> %s', substr($sql, 0, 80) . (strlen($sql) > 80 ? '...' : '')));
                } catch (\Exception $e) {
                    $errors++;
                    $io->text(sprintf('<error>[FAIL]</error> %s', substr($sql, 0, 80)));
                    $io->text(sprintf('       Error: %s', $e->getMessage()));
                }
            }

            if ($errors === 0) {
                $io->success('All schema changes applied successfully.');
            } else {
                $io->warning(sprintf('%d error(s) occurred. Some changes may not have been applied.', $errors));
            }

            $this->showTableList($io, $schemaManager);
        } else {
            $io->info('Run with --fix to automatically apply these changes.');
            $io->info('Run with --reset to drop everything and recreate from scratch.');
        }

        return Command::SUCCESS;
    }

    private function showTableList(SymfonyStyle $io, $schemaManager): void
    {
        $io->section('Current tables in database');
        $tables = $schemaManager->listTableNames();
        sort($tables);
        $io->listing($tables);
        $io->info(sprintf('Total: %d tables.', count($tables)));
    }
}
