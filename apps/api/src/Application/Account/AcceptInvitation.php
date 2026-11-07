<?php

declare(strict_types=1);

namespace App\Application\Account;

use App\Application\Port\Clock;
use App\Application\Port\IdGenerator;
use App\Application\Port\PasswordHasher;
use App\Application\Port\TransactionManager;
use App\Domain\Account\InvitationRepository;
use App\Domain\Account\PasswordPolicy;
use App\Domain\Account\User;
use App\Domain\Account\UserRepository;
use App\Domain\Shared\DomainException;
use App\Domain\Shared\NotFound;

/** L'invité choisit son mot de passe : son compte est créé et l'invitation consommée, ensemble. */
final readonly class AcceptInvitation
{
    public function __construct(
        private InvitationRepository $invitations,
        private UserRepository $users,
        private PasswordHasher $hasher,
        private IdGenerator $ids,
        private Clock $clock,
        private TransactionManager $transactions,
    ) {
    }

    public function __invoke(string $token, string $plainPassword): User
    {
        PasswordPolicy::assertAcceptable($plainPassword);

        return $this->transactions->transactional(function () use ($token, $plainPassword): User {
            $invitation = $this->invitations->findByToken($token)
                ?? throw new NotFound('Ce lien d’invitation n’est plus valable.');
            $now = $this->clock->now();
            $invitation->accept($now);

            $email = $invitation->email();
            if (null !== $this->users->findByEmail($email)) {
                throw new DomainException('Un compte existe déjà pour cette adresse.');
            }

            $user = User::register($this->ids->newId(), $email, $this->hasher->hash($plainPassword), $now);
            $this->users->save($user);
            $this->invitations->save($invitation);

            return $user;
        });
    }
}
