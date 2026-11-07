<?php

declare(strict_types=1);

namespace App\Domain\Account;

interface InvitationRepository
{
    public function save(Invitation $invitation): void;

    public function findByToken(string $token): ?Invitation;
}
