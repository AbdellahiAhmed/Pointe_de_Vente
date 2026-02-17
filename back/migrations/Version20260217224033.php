<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260217224033 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 2: Closing float->decimal, OrderProduct.costAtSale, User.roles array->json';
    }

    public function up(Schema $schema): void
    {
        // Closing: float -> decimal(20,2)
        $this->addSql('ALTER TABLE closing CHANGE opening_balance opening_balance NUMERIC(20, 2) DEFAULT NULL, CHANGE closing_balance closing_balance NUMERIC(20, 2) DEFAULT NULL, CHANGE cash_added cash_added NUMERIC(20, 2) DEFAULT NULL, CHANGE cash_withdrawn cash_withdrawn NUMERIC(20, 2) DEFAULT NULL, CHANGE expenses expenses NUMERIC(20, 2) DEFAULT NULL');

        // OrderProduct: add costAtSale column
        $this->addSql('ALTER TABLE order_product ADD cost_at_sale NUMERIC(20, 2) DEFAULT NULL');

        // User: array -> json
        $this->addSql('ALTER TABLE user_account CHANGE roles roles JSON NOT NULL COMMENT \'(DC2Type:json)\'');

        // Backfill costAtSale from current Product.cost
        $this->addSql('UPDATE order_product op INNER JOIN product p ON op.product_id = p.id SET op.cost_at_sale = COALESCE(p.cost, 0) WHERE op.cost_at_sale IS NULL');

        // Convert User.roles from PHP serialized to JSON
        $rows = $this->connection->fetchAllAssociative('SELECT id, roles FROM user_account');
        foreach ($rows as $row) {
            $roles = @unserialize($row['roles']);
            if ($roles === false && $row['roles'] !== 'b:0;') {
                $roles = json_decode($row['roles'], true);
            }
            if (!is_array($roles)) {
                $roles = ['ROLE_VENDEUR'];
            }
            $json = json_encode(array_values($roles));
            $this->connection->executeStatement(
                'UPDATE user_account SET roles = ? WHERE id = ?',
                [$json, $row['id']]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_account CHANGE roles roles LONGTEXT NOT NULL COMMENT \'(DC2Type:array)\'');
        $this->addSql('ALTER TABLE order_product DROP cost_at_sale');
        $this->addSql('ALTER TABLE closing CHANGE opening_balance opening_balance DOUBLE PRECISION DEFAULT NULL, CHANGE closing_balance closing_balance DOUBLE PRECISION DEFAULT NULL, CHANGE cash_added cash_added DOUBLE PRECISION DEFAULT NULL, CHANGE cash_withdrawn cash_withdrawn DOUBLE PRECISION DEFAULT NULL, CHANGE expenses expenses DOUBLE PRECISION DEFAULT NULL');
    }
}
