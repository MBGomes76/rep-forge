<?php

declare(strict_types=1);

namespace App\Domain\Account;

use App\Domain\Shared\DomainException;

/**
 * Longueur minimale plutôt que règles de composition : une phrase de passe
 * longue est plus sûre et plus facile à retenir (recommandation actuelle de l'ANSSI et du NIST).
 */
final class PasswordPolicy
{
    public const MIN_LENGTH = 10;
    /** Au-delà, le hachage deviendrait un moyen de surcharger le serveur. */
    public const MAX_LENGTH = 4096;

    public static function assertAcceptable(string $plainPassword): void
    {
        $length = mb_strlen($plainPassword);
        if ($length < self::MIN_LENGTH) {
            throw new DomainException(\sprintf('Le mot de passe doit contenir au moins %d caractères.', self::MIN_LENGTH));
        }
        if ($length > self::MAX_LENGTH) {
            throw new DomainException('Le mot de passe est trop long.');
        }
    }
}
