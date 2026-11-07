<?php

declare(strict_types=1);

namespace App\Application\Sync;

use App\Domain\Shared\DomainException;
use App\Domain\Sync\Document;
use App\Domain\Sync\DocumentRepository;
use App\Domain\Sync\DocumentType;

/**
 * « Qu'est-ce qui a changé depuis ma dernière synchronisation ? » Par pages :
 * l'appareil redemande à partir de la dernière révision reçue tant que `hasMore` est vrai.
 */
final readonly class ListChanges
{
    public const PAGE_SIZE = 200;

    public function __construct(private DocumentRepository $documents)
    {
    }

    /** @return array{documents: list<Document>, hasMore: bool} */
    public function __invoke(string $ownerId, DocumentType $type, int $afterRevision): array
    {
        if ($afterRevision < 0) {
            throw new DomainException('La révision de départ doit être positive.');
        }
        $page = $this->documents->changedAfter($ownerId, $type, $afterRevision, self::PAGE_SIZE + 1);

        return [
            'documents' => \array_slice($page, 0, self::PAGE_SIZE),
            'hasMore' => \count($page) > self::PAGE_SIZE,
        ];
    }
}
