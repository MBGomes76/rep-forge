<?php

declare(strict_types=1);

namespace App\Application\Sync;

use App\Application\Port\Clock;
use App\Application\Port\TransactionManager;
use App\Domain\Sync\Document;
use App\Domain\Sync\DocumentRepository;
use App\Domain\Sync\DocumentType;
use App\Domain\Sync\WriteOutcome;

/**
 * Crée ou modifie un document, avec l'identifiant choisi par l'appareil.
 * Rejouer le même envoi est sans effet : pas de doublon possible.
 */
final readonly class PutDocument
{
    public function __construct(
        private DocumentRepository $documents,
        private Clock $clock,
        private TransactionManager $transactions,
    ) {
    }

    /** @param array<mixed> $data */
    public function __invoke(string $ownerId, DocumentType $type, string $id, int $baseVersion, array $data): DocumentWrite
    {
        Document::assertValidId($id);

        return $this->transactions->transactional(function () use ($ownerId, $type, $id, $baseVersion, $data): DocumentWrite {
            $this->documents->lock($ownerId, $type, $id);
            $now = $this->clock->now();
            $document = $this->documents->find($ownerId, $type, $id);

            if (null === $document) {
                $document = Document::create($ownerId, $type, $id, $data, $baseVersion, $this->documents->nextRevision(), $now);
                $outcome = WriteOutcome::Created;
            } else {
                $outcome = $document->write($data, $baseVersion, $this->documents->nextRevision(...), $now);
            }

            if (WriteOutcome::Unchanged !== $outcome) {
                $this->documents->save($document);
            }

            return new DocumentWrite($document, $outcome);
        });
    }
}
