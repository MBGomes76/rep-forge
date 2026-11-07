<?php

declare(strict_types=1);

namespace App\Domain\Shared;

/**
 * Règle métier non respectée. Le message est en français : il est montré tel quel à l'utilisateur.
 */
class DomainException extends \DomainException
{
}
