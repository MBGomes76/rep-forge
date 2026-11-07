<?php

declare(strict_types=1);

namespace App\Application\Sync;

use App\Application\Port\Clock;
use App\Application\Port\TransactionManager;
use App\Domain\Shared\NotFound;
use App\Domain\Sync\DocumentRepository;
use App\Domain\Sync\DocumentType;
use App\Domain\Sync\WriteOutcome;

/** Supprime un document en laissant une trace, pour que les autres appareils l'apprennent. */
final readonly class DeleteDocument
{
    public function __construct(
        private DocumentRepository $documents,
        private Clock $clock,
        private TransactionManager $transactions,
    ) {
    }

    public function __invoke(string $ownerId, DocumentType $type, string $id, int $baseVersion): DocumentWrite
    {
        return $this->transactions->transactional(function () use ($ownerId, $type, $id, $baseVersion): DocumentWrite {
            $this->documents->lock($ownerId, $type, $id);
            $document = $this->documents->find($ownerId, $type, $id) ?? throw new NotFound('Document introuvable.');

            $outcome = $document->delete($baseVersion, $this->documents->nextRevision(...), $this->clock->now());
            if (WriteOutcome::Unchanged !== $outcome) {
                $this->documents->save($document);
            }

            return new DocumentWrite($document, $outcome);
        });
    }
}
