<?php

declare(strict_types=1);

namespace App\Infrastructure\Console;

use App\Application\Account\InviteUser;
use App\Domain\Shared\DomainException;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/** Les comptes se créent uniquement sur invitation : `bin/console app:invite ami@example.com`. */
#[AsCommand(name: 'app:invite', description: 'Crée un lien d’invitation à usage unique (valable 7 jours)')]
final readonly class InviteCommand
{
    public function __construct(
        private InviteUser $inviteUser,
        #[Autowire('%env(APP_FRONT_URL)%')] private string $frontUrl,
    ) {
    }

    public function __invoke(SymfonyStyle $io, #[Argument('Adresse e-mail de la personne invitée')] string $email): int
    {
        try {
            $invitation = ($this->inviteUser)($email);
        } catch (DomainException $exception) {
            $io->error($exception->getMessage());

            return Command::FAILURE;
        }

        $io->success('Invitation créée. Envoie ce lien à la personne invitée :');
        $io->writeln(rtrim($this->frontUrl, '/').'/invitation/'.$invitation->token);
        $io->newLine();
        $io->writeln(\sprintf('Valable jusqu’au %s (UTC), une seule fois.', $invitation->expiresAt->format('d/m/Y à H:i')));

        return Command::SUCCESS;
    }
}
