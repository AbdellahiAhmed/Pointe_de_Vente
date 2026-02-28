<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260228100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create stock_movement table for inventory audit trail';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE stock_movement (
            id INT AUTO_INCREMENT NOT NULL,
            product_id INT NOT NULL,
            product_store_id INT DEFAULT NULL,
            store_id INT DEFAULT NULL,
            user_id INT DEFAULT NULL,
            quantity_before NUMERIC(10, 2) NOT NULL,
            quantity_after NUMERIC(10, 2) NOT NULL,
            quantity_changed NUMERIC(10, 2) NOT NULL,
            type VARCHAR(20) NOT NULL,
            reference VARCHAR(255) DEFAULT NULL,
            reason VARCHAR(500) DEFAULT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_sm_product (product_id),
            INDEX idx_sm_type (type),
            INDEX idx_sm_created (created_at),
            INDEX IDX_63A8E2BF4584665A (product_id),
            INDEX IDX_63A8E2BF2CFB46CA (product_store_id),
            INDEX IDX_63A8E2BFB092A811 (store_id),
            INDEX IDX_63A8E2BFA76ED395 (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE stock_movement ADD CONSTRAINT FK_SM_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id)');
        $this->addSql('ALTER TABLE stock_movement ADD CONSTRAINT FK_SM_PRODUCT_STORE FOREIGN KEY (product_store_id) REFERENCES product_store (id)');
        $this->addSql('ALTER TABLE stock_movement ADD CONSTRAINT FK_SM_STORE FOREIGN KEY (store_id) REFERENCES store (id)');
        $this->addSql('ALTER TABLE stock_movement ADD CONSTRAINT FK_SM_USER FOREIGN KEY (user_id) REFERENCES user_account (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE stock_movement');
    }
}
