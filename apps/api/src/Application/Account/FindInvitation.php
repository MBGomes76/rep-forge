<?php

declare(strict_types=1);

namespace App\Application\Account;

use App\Application\Port\Clock;
use App\Domain\Account\Email;
use App\Domain\Account\InvitationRepository;
use App\Domain\Shared\NotFound;

/** Avant d'afficher le formulaire : l'invitation est-elle encore valable, et pour quelle adresse ? */
final readonly class FindInvitation
{
    public function __construct(
        private InvitationRepository $invitations,
        private Clock $clock,
    ) {
    }

    public function __invoke(string $token): Email
    {
        $invitation = $this->invitations->findByToken($token);
        if (null === $invitation || !$invitation->isUsable($this->clock->now())) {
            throw new NotFound('Ce lien d’invitation n’est plus valable.');
        }

        return $invitation->email();
    }
}
