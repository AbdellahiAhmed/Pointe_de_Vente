<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260226205220 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add performance indexes to order, order_product, product_store';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_order_is_deleted ON `order`');
        $this->addSql('DROP INDEX IF EXISTS idx_order_date_deleted ON `order`');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_order_status_deleted ON `order` (is_deleted, is_suspended, is_returned)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_order_created_at ON `order` (created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_op_created_at ON order_product (created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_ps_product_store ON product_store (product_id, store_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_order_status_deleted ON `order`');
        $this->addSql('DROP INDEX IF EXISTS idx_order_created_at ON `order`');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_order_is_deleted ON `order` (is_deleted)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_order_date_deleted ON `order` (created_at, is_deleted)');
        $this->addSql('DROP INDEX IF EXISTS idx_op_created_at ON order_product');
        $this->addSql('DROP INDEX IF EXISTS idx_ps_product_store ON product_store');
    }
}
