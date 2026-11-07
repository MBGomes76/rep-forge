<?php

declare(strict_types=1);

namespace App\Domain\Account;

use App\Domain\Shared\DomainException;

/**
 * Invitation à créer un compte : un lien à usage unique, valable 7 jours.
 *
 * Seule l'empreinte du jeton est conservée : une fuite de la base ne permet
 * pas d'utiliser les invitations en attente.
 */
class Invitation
{
    public const VALIDITY = 'P7D';

    private string $email;
    private \DateTimeImmutable $expiresAt;
    private ?\DateTimeImmutable $acceptedAt = null;

    private function __construct(
        private string $id,
        Email $email,
        private string $tokenHash,
        private \DateTimeImmutable $createdAt,
    ) {
        $this->email = $email->value;
        $this->expiresAt = $createdAt->add(new \DateInterval(self::VALIDITY));
    }

    public static function issue(string $id, Email $email, string $token, \DateTimeImmutable $now): self
    {
        return new self($id, $email, self::hashToken($token), $now);
    }

    /** Empreinte SHA-256 : le jeton est aléatoire et long, un hachage lent n'apporterait rien. */
    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function isUsable(\DateTimeImmutable $now): bool
    {
        return null === $this->acceptedAt && $now < $this->expiresAt;
    }

    public function accept(\DateTimeImmutable $now): void
    {
        if (null !== $this->acceptedAt) {
            throw new DomainException('Cette invitation a déjà été utilisée.');
        }
        if ($now >= $this->expiresAt) {
            throw new DomainException('Cette invitation a expiré. Demande un nouveau lien.');
        }
        $this->acceptedAt = $now;
    }

    public function id(): string
    {
        return $this->id;
    }

    public function email(): Email
    {
        return Email::fromString($this->email);
    }

    public function expiresAt(): \DateTimeImmutable
    {
        return $this->expiresAt;
    }
}
