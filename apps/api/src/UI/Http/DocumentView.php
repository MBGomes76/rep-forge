<?php

declare(strict_types=1);

namespace App\UI\Http;

use App\Domain\Sync\Document;

/** Représentation JSON d'un document, la même partout dans l'API. */
final class DocumentView
{
    /** @return array<string, mixed> */
    public static function of(Document $document): array
    {
        return [
            'id' => $document->id(),
            'version' => $document->version(),
            'revision' => $document->revision(),
            'deleted' => $document->isDeleted(),
            'updatedAt' => $document->updatedAt()->format(\DATE_ATOM),
            'data' => $document->data(),
        ];
    }
}
