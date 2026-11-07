<?php

declare(strict_types=1);

namespace App\Domain\Shared;

/** Élément introuvable, ou appartenant à un autre compte (on ne distingue pas les deux). */
final class NotFound extends DomainException
{
}
