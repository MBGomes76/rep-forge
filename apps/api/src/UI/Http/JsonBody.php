<?php

declare(strict_types=1);

namespace App\UI\Http;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/** Lecture du corps JSON des requêtes, avec des erreurs claires. */
final class JsonBody
{
    /** @return array<mixed> */
    public static function decode(Request $request): array
    {
        try {
            $body = json_decode($request->getContent(), true, 64, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new BadRequestHttpException('Le corps de la requête n’est pas du JSON valide.');
        }
        if (!\is_array($body)) {
            throw new BadRequestHttpException('Le corps de la requête doit être un objet JSON.');
        }

        return $body;
    }

    /** @param array<mixed> $body */
    public static function string(array $body, string $field): string
    {
        $value = $body[$field] ?? null;
        if (!\is_string($value)) {
            throw new BadRequestHttpException(\sprintf('Champ « %s » manquant.', $field));
        }

        return $value;
    }
}
