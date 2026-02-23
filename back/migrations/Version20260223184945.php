<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Performance indexes for sales speed and report queries.
 */
final class Version20260223184945 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add performance indexes on order and ext_log_entries tables';
    }

    public function up(Schema $schema): void
    {
        // Critical: order_id index for getNewOrderId() MAX query
        $this->addSql('CREATE INDEX idx_order_order_id ON `order` (order_id)');

        // Report performance: date-based queries
        $this->addSql('CREATE INDEX idx_order_created_at ON `order` (created_at)');

        // Report filter: is_deleted
        $this->addSql('CREATE INDEX idx_order_is_deleted ON `order` (is_deleted)');

        // Composite index for common report pattern: date range + not deleted
        $this->addSql('CREATE INDEX idx_order_date_deleted ON `order` (created_at, is_deleted)');

        // Scalability: audit log cleanup by date
        $this->addSql('CREATE INDEX idx_ext_log_date ON ext_log_entries (logged_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_order_order_id ON `order`');
        $this->addSql('DROP INDEX idx_order_created_at ON `order`');
        $this->addSql('DROP INDEX idx_order_is_deleted ON `order`');
        $this->addSql('DROP INDEX idx_order_date_deleted ON `order`');
        $this->addSql('DROP INDEX idx_ext_log_date ON ext_log_entries');
    }
}
