<?php

declare(strict_types=1);

namespace App\Domain\Sync;

enum WriteOutcome
{
    case Created;
    case Updated;
    /** Envoi rejoué ou déjà appliqué : rien ne change (idempotence). */
    case Unchanged;
}
