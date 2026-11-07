<?php

declare(strict_types=1);

namespace App\Infrastructure\Security;

use App\Domain\Account\Email;
use App\Domain\Account\UserRepository;
use App\Domain\Shared\DomainException;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/** @implements UserProviderInterface<SecurityUser> */
final readonly class UserProvider implements UserProviderInterface
{
    public function __construct(private UserRepository $users)
    {
    }

    public function loadUserByIdentifier(string $identifier): SecurityUser
    {
        try {
            $user = $this->users->findByEmail(Email::fromString($identifier));
        } catch (DomainException) {
            $user = null;
        }
        if (null === $user) {
            throw new UserNotFoundException();
        }

        return SecurityUser::fromUser($user);
    }

    public function refreshUser(UserInterface $user): SecurityUser
    {
        if (!$user instanceof SecurityUser) {
            throw new UnsupportedUserException();
        }

        return $this->loadUserByIdentifier($user->getUserIdentifier());
    }

    public function supportsClass(string $class): bool
    {
        return SecurityUser::class === $class;
    }
}
