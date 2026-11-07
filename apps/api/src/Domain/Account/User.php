<?php

declare(strict_types=1);

namespace App\Domain\Account;

/**
 * Compte d'un utilisateur. Le domaine ne voit que l'empreinte du mot de passe,
 * jamais le mot de passe lui-même : le hachage est un détail d'infrastructure.
 */
class User
{
    private string $email;

    private function __construct(
        private string $id,
        Email $email,
        private string $passwordHash,
        private \DateTimeImmutable $createdAt,
    ) {
        $this->email = $email->value;
    }

    public static function register(string $id, Email $email, string $passwordHash, \DateTimeImmutable $now): self
    {
        return new self($id, $email, $passwordHash, $now);
    }

    public function id(): string
    {
        return $this->id;
    }

    public function email(): Email
    {
        return Email::fromString($this->email);
    }

    public function passwordHash(): string
    {
        return $this->passwordHash;
    }

    public function createdAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
