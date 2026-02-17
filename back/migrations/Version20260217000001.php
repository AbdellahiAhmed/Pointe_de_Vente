<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260217000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Migrate ROLE_USER to ROLE_VENDEUR in user_account.roles (PHP serialized array)';
    }

    public function up(Schema $schema): void
    {
        // The roles column uses ORM type="array" which stores PHP serialized data.
        // ROLE_USER is 9 chars (s:9:"ROLE_USER"), ROLE_VENDEUR is 13 chars (s:13:"ROLE_VENDEUR").
        // We must replace the serialized string including the length prefix to preserve integrity.
        $this->addSql("UPDATE user_account SET roles = REPLACE(roles, 's:9:\"ROLE_USER\"', 's:13:\"ROLE_VENDEUR\"') WHERE roles LIKE '%ROLE_USER%'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE user_account SET roles = REPLACE(roles, 's:13:\"ROLE_VENDEUR\"', 's:9:\"ROLE_USER\"') WHERE roles LIKE '%ROLE_VENDEUR%'");
    }
}
