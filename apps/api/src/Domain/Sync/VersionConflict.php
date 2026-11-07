<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Domain\Shared\DomainException;

/**
 * L'envoi part d'une version que le serveur a déjà dépassée : un autre appareil
 * a modifié le document entre-temps. Jamais d'écrasement silencieux : on renvoie
 * la version du serveur pour que l'utilisateur choisisse.
 */
final class VersionConflict extends DomainException
{
    public function __construct(public readonly Document $current)
    {
        parent::__construct('Ce document a été modifié sur un autre appareil.');
    }
}
