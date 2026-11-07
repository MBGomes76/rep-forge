<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain\Sync;

use App\Domain\Shared\DomainException;
use App\Domain\Sync\Document;
use App\Domain\Sync\DocumentType;
use App\Domain\Sync\OutdatedClient;
use App\Domain\Sync\VersionConflict;
use App\Domain\Sync\WriteOutcome;
use PHPUnit\Framework\TestCase;

final class DocumentTest extends TestCase
{
    private \DateTimeImmutable $now;
    private int $revisions = 0;

    protected function setUp(): void
    {
        $this->now = new \DateTimeImmutable('2026-11-07 10:00:00');
        $this->revisions = 10;
    }

    /** @return array<string, mixed> */
    private static function program(string $name = 'PPL'): array
    {
        return [
            'id' => 'p1',
            'name' => $name,
            'steps' => [['kind' => 'rest', 'id' => 'r1', 'name' => 'Repos']],
            'schedule' => ['cursor' => 0, 'anchor' => '2026-11-07'],
        ];
    }

    private function nextRevision(): \Closure
    {
        return fn (): int => ++$this->revisions;
    }

    private function created(): Document
    {
        return Document::create('alice', DocumentType::Program, 'p1', self::program(), 0, 1, $this->now);
    }

    public function testUneCreationDemarreEnVersionUn(): void
    {
        $document = $this->created();

        self::assertSame(1, $document->version());
        self::assertSame(1, $document->revision());
        self::assertFalse($document->isDeleted());
    }

    public function testUneModificationBaseeSurLaVersionCouranteIncrementeLaVersion(): void
    {
        $document = $this->created();

        self::assertSame(WriteOutcome::Updated, $document->write(self::program('Push Pull'), 1, $this->nextRevision(), $this->now));
        self::assertSame(2, $document->version());
        self::assertSame(11, $document->revision());
        self::assertSame('Push Pull', $document->data()['name'] ?? null);
    }

    public function testUnEnvoiRejoueNeChangeRien(): void
    {
        $document = $this->created();
        $document->write(self::program('Push Pull'), 1, $this->nextRevision(), $this->now);

        // Même contenu, clés dans un autre ordre (comme le renvoie jsonb), version de base périmée.
        $replay = array_reverse(self::program('Push Pull'), true);
        self::assertSame(WriteOutcome::Unchanged, $document->write($replay, 1, $this->nextRevision(), $this->now));
        self::assertSame(2, $document->version());
        self::assertSame(11, $document->revision(), 'aucune révision consommée');
    }

    public function testUnEnvoiBaseSurUneVersionDepasseeEstUnConflit(): void
    {
        $document = $this->created();
        $document->write(self::program('Depuis le téléphone'), 1, $this->nextRevision(), $this->now);

        try {
            $document->write(self::program('Depuis l’ordinateur'), 1, $this->nextRevision(), $this->now);
            self::fail('Un conflit était attendu.');
        } catch (VersionConflict $conflict) {
            // Rien n'est écrasé, et la version du serveur est renvoyée pour que l'utilisateur choisisse.
            self::assertSame('Depuis le téléphone', $conflict->current->data()['name'] ?? null);
            self::assertSame(2, $conflict->current->version());
        }
    }

    public function testUneSuppressionLaisseUneTraceEtSeRejoueSansErreur(): void
    {
        $document = $this->created();

        self::assertSame(WriteOutcome::Updated, $document->delete(1, $this->nextRevision(), $this->now));
        self::assertTrue($document->isDeleted());
        self::assertSame(2, $document->version());
        self::assertSame(WriteOutcome::Unchanged, $document->delete(1, $this->nextRevision(), $this->now));
    }

    public function testUneSuppressionBaseeSurUneVersionDepasseeEstUnConflit(): void
    {
        $document = $this->created();
        $document->write(self::program('Modifié ailleurs'), 1, $this->nextRevision(), $this->now);

        $this->expectException(VersionConflict::class);
        $document->delete(1, $this->nextRevision(), $this->now);
    }

    public function testUneAncienneVersionDeLAppNEcrasePasUnDocumentPlusRecent(): void
    {
        $document = $this->created();
        // Une version récente de l'app écrit au format 2, avec un champ que l'ancienne ne connaît pas.
        $document->write([...self::program(), 'format' => 2, 'note' => 'Nouveau champ'], 1, $this->nextRevision(), $this->now);

        try {
            $document->write([...self::program('Ancienne app'), 'format' => 1], 2, $this->nextRevision(), $this->now);
            self::fail('L’envoi aurait dû être refusé.');
        } catch (OutdatedClient) {
            self::assertSame('Nouveau champ', $document->data()['note'] ?? null);
        }

        // Le même format, ou un plus récent, passe normalement.
        self::assertSame(WriteOutcome::Updated, $document->write([...self::program('Récente'), 'format' => 2], 2, $this->nextRevision(), $this->now));
    }

    public function testUneCreationNePeutPasPartirDUneVersionExistante(): void
    {
        $this->expectException(DomainException::class);
        Document::create('alice', DocumentType::Program, 'p1', self::program(), 3, 1, $this->now);
    }

    public function testRefuseUnIdentifiantFantaisiste(): void
    {
        $this->expectExceptionObject(new DomainException('Identifiant de document invalide.'));
        Document::create('alice', DocumentType::Program, '../p1', self::program(), 0, 1, $this->now);
    }
}
