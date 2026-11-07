<?php

declare(strict_types=1);

namespace App\Infrastructure\System;

use App\Application\Port\TokenGenerator;

/** 256 bits aléatoires, encodés en base64 « URL » (43 caractères). */
final class RandomTokenGenerator implements TokenGenerator
{
    public function generate(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}
