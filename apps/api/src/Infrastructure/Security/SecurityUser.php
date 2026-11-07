<?php

declare(strict_types=1);

namespace App\Infrastructure\Security;

use App\Domain\Account\User;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Adaptateur entre le compte du domaine et le composant Security de Symfony :
 * le domaine n'a ainsi aucune dépendance au framework.
 */
final readonly class SecurityUser implements UserInterface, PasswordAuthenticatedUserInterface
{
    public function __construct(
        public string $id,
        private string $email,
        private string $passwordHash,
    ) {
    }

    public static function fromUser(User $user): self
    {
        return new self($user->id(), $user->email()->value, $user->passwordHash());
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getPassword(): string
    {
        return $this->passwordHash;
    }

    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
    }
}
