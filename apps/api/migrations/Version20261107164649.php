<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Comptes, invitations et documents synchronisés.
 */
final class Version20261107164649 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Comptes sur invitation et documents synchronisés (programmes, séances, repos, réglages)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE app_user (email VARCHAR(254) NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_88BDF3E9E7927C74 ON app_user (email)');
        $this->addSql('CREATE TABLE document (version INT NOT NULL, revision BIGINT NOT NULL, data JSONB DEFAULT NULL, updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, owner_id UUID NOT NULL, type VARCHAR(20) NOT NULL, id VARCHAR(100) NOT NULL, PRIMARY KEY (owner_id, type, id))');
        $this->addSql('CREATE INDEX document_changes_idx ON document (owner_id, type, revision)');
        $this->addSql('CREATE TABLE invitation (email VARCHAR(254) NOT NULL, token_hash VARCHAR(64) NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, expires_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, accepted_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_F11D61A2B3BC57DA ON invitation (token_hash)');
        // Compteur global des révisions : « ce qui a changé depuis N » pour la synchronisation.
        $this->addSql('CREATE SEQUENCE document_revision_seq');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE app_user');
        $this->addSql('DROP TABLE document');
        $this->addSql('DROP TABLE invitation');
        $this->addSql('DROP SEQUENCE document_revision_seq');
    }
}
