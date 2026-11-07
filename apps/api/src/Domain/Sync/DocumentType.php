<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Domain\Shared\DomainException;

/**
 * Types de données synchronisées. Les règles métier s'exécutent sur l'appareil
 * (hors ligne) : le serveur vérifie seulement la forme minimale de chaque document,
 * pour ne jamais stocker de données inutilisables par les autres appareils.
 */
enum DocumentType: string
{
    case Program = 'program';
    case Workout = 'workout';
    case RestDay = 'rest_day';
    case Setting = 'setting';

    private const DATE_PATTERN = '/^\d{4}-\d{2}-\d{2}$/';

    /** @param array<mixed> $data */
    public function assertValidPayload(string $id, array $data): void
    {
        switch ($this) {
            case self::Program:
                self::requireFields($data, $id, ['name' => 'string', 'steps' => 'list', 'schedule' => 'array']);
                self::requireSchedule($data['schedule']);
                break;
            case self::Workout:
                self::requireFields($data, $id, [
                    'programId' => 'string',
                    'stepId' => 'string',
                    'name' => 'string',
                    'startedAt' => 'string',
                    'exercises' => 'list',
                ]);
                break;
            case self::RestDay:
                self::requireFields($data, $id, ['programId' => 'string', 'date' => 'date']);
                break;
            case self::Setting:
                if (!\array_key_exists('value', $data)) {
                    throw new DomainException('Réglage invalide : champ « value » manquant.');
                }
                break;
        }
    }

    /**
     * @param array<mixed>          $data
     * @param array<string, string> $fields champ => type attendu
     */
    private static function requireFields(array $data, string $id, array $fields): void
    {
        if (($data['id'] ?? null) !== $id) {
            throw new DomainException('Données invalides : l’identifiant ne correspond pas à l’adresse.');
        }
        foreach ($fields as $field => $type) {
            $value = $data[$field] ?? null;
            $valid = match ($type) {
                'string' => \is_string($value),
                'list' => \is_array($value) && array_is_list($value),
                'array' => \is_array($value),
                'date' => \is_string($value) && 1 === preg_match(self::DATE_PATTERN, $value),
            };
            if (!$valid) {
                throw new DomainException(\sprintf('Données invalides : champ « %s » manquant ou mal formé.', $field));
            }
        }
    }

    private static function requireSchedule(mixed $schedule): void
    {
        $cursor = \is_array($schedule) ? ($schedule['cursor'] ?? null) : null;
        $anchor = \is_array($schedule) ? ($schedule['anchor'] ?? null) : null;
        if (!\is_int($cursor) || $cursor < 0 || !\is_string($anchor) || 1 !== preg_match(self::DATE_PATTERN, $anchor)) {
            throw new DomainException('Données invalides : planification (« schedule ») mal formée.');
        }
    }
}
