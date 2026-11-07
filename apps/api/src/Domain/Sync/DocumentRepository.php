<?php

declare(strict_types=1);

namespace App\Domain\Sync;

interface DocumentRepository
{
    /** Toujours cherché DANS un compte : impossible de lire le document d'un autre. */
    public function find(string $ownerId, DocumentType $type, string $id): ?Document;

    public function save(Document $document): void;

    /**
     * Documents modifiés après une révision, dans l'ordre des révisions.
     *
     * @return list<Document>
     */
    public function changedAfter(string $ownerId, DocumentType $type, int $afterRevision, int $limit): array;

    /** Prochaine valeur du compteur global de révisions. */
    public function nextRevision(): int;

    /**
     * Sérialise les écritures sur un même document jusqu'à la fin de la
     * transaction, création comprise : deux envois simultanés du même
     * document (un envoi et sa répétition) ne se marchent pas dessus.
     */
    public function lock(string $ownerId, DocumentType $type, string $id): void;
}
