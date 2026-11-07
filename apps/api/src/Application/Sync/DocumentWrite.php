<?php

declare(strict_types=1);

namespace App\Application\Sync;

use App\Domain\Sync\Document;
use App\Domain\Sync\WriteOutcome;

final readonly class DocumentWrite
{
    public function __construct(
        public Document $document,
        public WriteOutcome $outcome,
    ) {
    }
}
