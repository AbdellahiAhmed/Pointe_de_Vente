<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260220004932 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE return_request (id INT AUTO_INCREMENT NOT NULL, order_id INT NOT NULL, requested_by_id INT NOT NULL, approved_by_id INT DEFAULT NULL, store_id INT DEFAULT NULL, status VARCHAR(20) NOT NULL, reason LONGTEXT DEFAULT NULL, created_at DATETIME DEFAULT NULL, deleted_at DATETIME DEFAULT NULL, updated_at DATETIME DEFAULT NULL, uuid VARCHAR(255) DEFAULT NULL, INDEX IDX_2DBF9D408D9F6D38 (order_id), INDEX IDX_2DBF9D404DA1E751 (requested_by_id), INDEX IDX_2DBF9D402D234F6A (approved_by_id), INDEX IDX_2DBF9D40B092A811 (store_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE return_request_item (id INT AUTO_INCREMENT NOT NULL, return_request_id INT NOT NULL, order_product_id INT NOT NULL, quantity INT NOT NULL, reason LONGTEXT DEFAULT NULL, INDEX IDX_BBCFD7F789EA1297 (return_request_id), INDEX IDX_BBCFD7F7F65E9B0F (order_product_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE return_request ADD CONSTRAINT FK_2DBF9D408D9F6D38 FOREIGN KEY (order_id) REFERENCES `order` (id)');
        $this->addSql('ALTER TABLE return_request ADD CONSTRAINT FK_2DBF9D404DA1E751 FOREIGN KEY (requested_by_id) REFERENCES user_account (id)');
        $this->addSql('ALTER TABLE return_request ADD CONSTRAINT FK_2DBF9D402D234F6A FOREIGN KEY (approved_by_id) REFERENCES user_account (id)');
        $this->addSql('ALTER TABLE return_request ADD CONSTRAINT FK_2DBF9D40B092A811 FOREIGN KEY (store_id) REFERENCES store (id)');
        $this->addSql('ALTER TABLE return_request_item ADD CONSTRAINT FK_BBCFD7F789EA1297 FOREIGN KEY (return_request_id) REFERENCES return_request (id)');
        $this->addSql('ALTER TABLE return_request_item ADD CONSTRAINT FK_BBCFD7F7F65E9B0F FOREIGN KEY (order_product_id) REFERENCES order_product (id)');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('ALTER TABLE product ADD min_price NUMERIC(20, 2) DEFAULT NULL');
        $this->addSql('ALTER TABLE product_variant CHANGE quantity quantity NUMERIC(10, 2) DEFAULT \'0\'');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT NOT NULL, refresh_token VARCHAR(128) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, username VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, valid DATETIME NOT NULL, UNIQUE INDEX UNIQ_9BACE7E1C74F2195 (refresh_token), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE return_request DROP FOREIGN KEY FK_2DBF9D408D9F6D38');
        $this->addSql('ALTER TABLE return_request DROP FOREIGN KEY FK_2DBF9D404DA1E751');
        $this->addSql('ALTER TABLE return_request DROP FOREIGN KEY FK_2DBF9D402D234F6A');
        $this->addSql('ALTER TABLE return_request DROP FOREIGN KEY FK_2DBF9D40B092A811');
        $this->addSql('ALTER TABLE return_request_item DROP FOREIGN KEY FK_BBCFD7F789EA1297');
        $this->addSql('ALTER TABLE return_request_item DROP FOREIGN KEY FK_BBCFD7F7F65E9B0F');
        $this->addSql('DROP TABLE return_request');
        $this->addSql('DROP TABLE return_request_item');
        $this->addSql('ALTER TABLE product DROP min_price');
        $this->addSql('ALTER TABLE product_variant CHANGE quantity quantity NUMERIC(10, 2) DEFAULT \'0.00\'');
    }
}
