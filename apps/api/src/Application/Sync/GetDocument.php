<?php

declare(strict_types=1);

namespace App\Application\Sync;

use App\Domain\Shared\NotFound;
use App\Domain\Sync\Document;
use App\Domain\Sync\DocumentRepository;
use App\Domain\Sync\DocumentType;

final readonly class GetDocument
{
    public function __construct(private DocumentRepository $documents)
    {
    }

    public function __invoke(string $ownerId, DocumentType $type, string $id): Document
    {
        return $this->documents->find($ownerId, $type, $id) ?? throw new NotFound('Document introuvable.');
    }
}
