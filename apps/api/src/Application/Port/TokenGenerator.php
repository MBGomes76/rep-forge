<?php

declare(strict_types=1);

namespace App\Application\Port;

interface TokenGenerator
{
    /** Jeton aléatoire, imprévisible, utilisable dans une URL. */
    public function generate(): string;
}
