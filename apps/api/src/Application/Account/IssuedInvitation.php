<?php

declare(strict_types=1);

namespace App\Application\Account;

final readonly class IssuedInvitation
{
    public function __construct(
        public string $token,
        public \DateTimeImmutable $expiresAt,
    ) {
    }
}
