<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Domain\Shared\DomainException;

/**
 * Une ancienne version de l'application renvoie un document qu'une version plus
 * récente a écrit dans un format plus riche : l'accepter effacerait en silence
 * les champs qu'elle ne connaît pas.
 */
final class OutdatedClient extends DomainException
{
    public function __construct()
    {
        parent::__construct('Une version plus récente de l’application a modifié ce document : mets l’application à jour.');
    }
}
