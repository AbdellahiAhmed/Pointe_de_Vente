<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260217_ZReport extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add zReportNumber (INT UNIQUE) and zReportSnapshot (JSON) columns to closing table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE closing ADD z_report_number INT DEFAULT NULL');
        $this->addSql('ALTER TABLE closing ADD z_report_snapshot JSON DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_closing_z_report_number ON closing (z_report_number)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_closing_z_report_number ON closing');
        $this->addSql('ALTER TABLE closing DROP z_report_number');
        $this->addSql('ALTER TABLE closing DROP z_report_snapshot');
    }
}
