<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260227022303 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('ALTER TABLE customer_payment ADD payment_type_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE customer_payment ADD CONSTRAINT FK_71F520B3DC058279 FOREIGN KEY (payment_type_id) REFERENCES payment (id)');
        $this->addSql('CREATE INDEX IDX_71F520B3DC058279 ON customer_payment (payment_type_id)');
        $this->addSql('ALTER TABLE expense ADD payment_type_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE expense ADD CONSTRAINT FK_2D3A8DA6DC058279 FOREIGN KEY (payment_type_id) REFERENCES payment (id)');
        $this->addSql('CREATE INDEX IDX_2D3A8DA6DC058279 ON expense (payment_type_id)');
        $this->addSql('DROP INDEX idx_ext_log_date ON ext_log_entries');
        $this->addSql('ALTER TABLE `order` RENAME INDEX idx_f5299398b092a811 TO idx_order_store');
        $this->addSql('ALTER TABLE `order` RENAME INDEX idx_f5299398e77b6ce8 TO idx_order_terminal');
        $this->addSql('ALTER TABLE order_product RENAME INDEX idx_2530ade6fa237437 TO idx_op_order');
        $this->addSql('ALTER TABLE order_product RENAME INDEX idx_2530ade64584665a TO idx_op_product');
        $this->addSql('ALTER TABLE product_variant CHANGE quantity quantity NUMERIC(10, 2) DEFAULT \'0\'');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, refresh_token VARCHAR(128) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, username VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, valid DATETIME NOT NULL, UNIQUE INDEX refresh_token (refresh_token), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE expense DROP FOREIGN KEY FK_2D3A8DA6DC058279');
        $this->addSql('DROP INDEX IDX_2D3A8DA6DC058279 ON expense');
        $this->addSql('ALTER TABLE expense DROP payment_type_id');
        $this->addSql('CREATE INDEX idx_ext_log_date ON ext_log_entries (logged_at)');
        $this->addSql('ALTER TABLE order_product RENAME INDEX idx_op_order TO IDX_2530ADE6FA237437');
        $this->addSql('ALTER TABLE order_product RENAME INDEX idx_op_product TO IDX_2530ADE64584665A');
        $this->addSql('ALTER TABLE customer_payment DROP FOREIGN KEY FK_71F520B3DC058279');
        $this->addSql('DROP INDEX IDX_71F520B3DC058279 ON customer_payment');
        $this->addSql('ALTER TABLE customer_payment DROP payment_type_id');
        $this->addSql('ALTER TABLE `order` RENAME INDEX idx_order_store TO IDX_F5299398B092A811');
        $this->addSql('ALTER TABLE `order` RENAME INDEX idx_order_terminal TO IDX_F5299398E77B6CE8');
        $this->addSql('ALTER TABLE product_variant CHANGE quantity quantity NUMERIC(10, 2) DEFAULT \'0.00\'');
    }
}
