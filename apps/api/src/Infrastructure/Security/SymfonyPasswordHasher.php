<?php

declare(strict_types=1);

namespace App\Infrastructure\Security;

use App\Application\Port\PasswordHasher;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactoryInterface;

/** Algorithme choisi par Symfony (« auto » : bcrypt ou argon2id), le même que pour la connexion. */
final readonly class SymfonyPasswordHasher implements PasswordHasher
{
    public function __construct(private PasswordHasherFactoryInterface $factory)
    {
    }

    public function hash(string $plainPassword): string
    {
        return $this->factory->getPasswordHasher(SecurityUser::class)->hash($plainPassword);
    }
}
