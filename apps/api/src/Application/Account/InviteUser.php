<?php

declare(strict_types=1);

namespace App\Application\Account;

use App\Application\Port\Clock;
use App\Application\Port\IdGenerator;
use App\Application\Port\TokenGenerator;
use App\Domain\Account\Email;
use App\Domain\Account\Invitation;
use App\Domain\Account\InvitationRepository;
use App\Domain\Account\UserRepository;
use App\Domain\Shared\DomainException;

/** Crée une invitation et renvoie le jeton en clair : c'est la seule fois qu'il existe. */
final readonly class InviteUser
{
    public function __construct(
        private UserRepository $users,
        private InvitationRepository $invitations,
        private TokenGenerator $tokens,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    public function __invoke(string $email): IssuedInvitation
    {
        $address = Email::fromString($email);
        if (null !== $this->users->findByEmail($address)) {
            throw new DomainException('Un compte existe déjà pour cette adresse.');
        }

        $token = $this->tokens->generate();
        $invitation = Invitation::issue($this->ids->newId(), $address, $token, $this->clock->now());
        $this->invitations->save($invitation);

        return new IssuedInvitation($token, $invitation->expiresAt());
    }
}
