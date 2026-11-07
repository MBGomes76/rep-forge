<?php

declare(strict_types=1);

namespace App\Domain\Account;

use App\Domain\Shared\DomainException;

/** Adresse e-mail normalisée (minuscules, sans espaces) : une adresse = un compte. */
final readonly class Email
{
    private function __construct(public string $value)
    {
    }

    public static function fromString(string $raw): self
    {
        $value = mb_strtolower(trim($raw));
        if (false === filter_var($value, \FILTER_VALIDATE_EMAIL)) {
            throw new DomainException('Adresse e-mail invalide.');
        }

        return new self($value);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
