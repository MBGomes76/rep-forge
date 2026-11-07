<?php

declare(strict_types=1);

namespace App\Infrastructure\System;

use App\Application\Port\IdGenerator;
use Symfony\Component\Uid\Uuid;

/** UUID v7 : uniques et triés par date de création (index plus compacts que la v4). */
final class UuidGenerator implements IdGenerator
{
    public function newId(): string
    {
        return Uuid::v7()->toRfc4122();
    }
}
