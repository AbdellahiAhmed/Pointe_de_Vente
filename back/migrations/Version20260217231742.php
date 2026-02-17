<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260217231742 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add category column to payment table for Z-Report bucketing (cash/mobile/credit)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE payment ADD category VARCHAR(20) DEFAULT 'cash' NOT NULL");

        // Backfill category for existing payment rows
        $this->addSql("UPDATE payment SET category = 'mobile' WHERE type IN ('bankily', 'masrivi', 'sedad', 'credit card')");
        $this->addSql("UPDATE payment SET category = 'credit' WHERE type = 'credit'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payment DROP category');
    }
}
