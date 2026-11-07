<?php

declare(strict_types=1);

namespace App\Domain\Sync;

use App\Domain\Shared\DomainException;

/**
 * Un programme, une séance, un jour de repos ou un réglage, tel que l'appareil l'a envoyé.
 *
 * - `version` compte les modifications de CE document. L'appareil indique sur
 *   quelle version il s'est basé : c'est ce qui détecte les conflits.
 * - `revision` est un compteur global et croissant : un appareil demande « tout
 *   ce qui a changé après la révision N » pour se mettre à jour.
 * - Une suppression laisse une trace (`data` = null) pour que les autres appareils l'apprennent.
 */
class Document
{
    private const ID_PATTERN = '/^[A-Za-z0-9:_-]{1,100}$/';

    /** @param array<mixed>|null $data */
    private function __construct(
        private string $ownerId,
        private DocumentType $type,
        private string $id,
        private int $version,
        private int $revision,
        private ?array $data,
        private \DateTimeImmutable $updatedAt,
    ) {
    }

    /** @param array<mixed> $data */
    public static function create(
        string $ownerId,
        DocumentType $type,
        string $id,
        array $data,
        int $baseVersion,
        int $revision,
        \DateTimeImmutable $now,
    ): self {
        self::assertValidId($id);
        if (0 !== $baseVersion) {
            throw new DomainException('Ce document est inconnu du serveur : il ne peut pas partir d’une version existante.');
        }
        $type->assertValidPayload($id, $data);

        return new self($ownerId, $type, $id, 1, $revision, $data, $now);
    }

    /**
     * @param array<mixed>    $data
     * @param \Closure(): int $nextRevision appelée seulement si le document change
     */
    public function write(array $data, int $baseVersion, \Closure $nextRevision, \DateTimeImmutable $now): WriteOutcome
    {
        // Même contenu (envoi rejoué après une coupure réseau, par exemple) : rien à faire.
        if (null !== $this->data && self::sameContent($this->data, $data)) {
            return WriteOutcome::Unchanged;
        }
        $this->assertBasedOnCurrentVersion($baseVersion);
        if (null !== $this->data && self::formatOf($data) < self::formatOf($this->data)) {
            throw new OutdatedClient();
        }
        $this->type->assertValidPayload($this->id, $data);
        $this->apply($data, $nextRevision(), $now);

        return WriteOutcome::Updated;
    }

    /** @param \Closure(): int $nextRevision appelée seulement si le document change */
    public function delete(int $baseVersion, \Closure $nextRevision, \DateTimeImmutable $now): WriteOutcome
    {
        if (null === $this->data) {
            return WriteOutcome::Unchanged;
        }
        $this->assertBasedOnCurrentVersion($baseVersion);
        $this->apply(null, $nextRevision(), $now);

        return WriteOutcome::Updated;
    }

    /**
     * Numéro de format du document, fixé par l'application (1 si absent :
     * documents créés avant l'introduction des formats).
     *
     * @param array<mixed> $data
     */
    private static function formatOf(array $data): int
    {
        return \is_int($data['format'] ?? null) ? $data['format'] : 1;
    }

    public static function assertValidId(string $id): void
    {
        if (1 !== preg_match(self::ID_PATTERN, $id)) {
            throw new DomainException('Identifiant de document invalide.');
        }
    }

    private function assertBasedOnCurrentVersion(int $baseVersion): void
    {
        if ($baseVersion !== $this->version) {
            throw new VersionConflict($this);
        }
    }

    /** @param array<mixed>|null $data */
    private function apply(?array $data, int $revision, \DateTimeImmutable $now): void
    {
        $this->data = $data;
        ++$this->version;
        $this->revision = $revision;
        $this->updatedAt = $now;
    }

    /**
     * Comparaison indépendante de l'ordre des clés : PostgreSQL (jsonb) les réordonne.
     *
     * @param array<mixed> $a
     * @param array<mixed> $b
     */
    private static function sameContent(array $a, array $b): bool
    {
        return self::canonical($a) === self::canonical($b);
    }

    private static function canonical(mixed $value): mixed
    {
        if (!\is_array($value)) {
            // 60 et 60.0 désignent le même poids.
            return \is_float($value) && floor($value) === $value ? (int) $value : $value;
        }
        if (!array_is_list($value)) {
            ksort($value);
        }

        return array_map(self::canonical(...), $value);
    }

    public function ownerId(): string
    {
        return $this->ownerId;
    }

    public function type(): DocumentType
    {
        return $this->type;
    }

    public function id(): string
    {
        return $this->id;
    }

    public function version(): int
    {
        return $this->version;
    }

    public function revision(): int
    {
        return $this->revision;
    }

    /** @return array<mixed>|null null si le document a été supprimé */
    public function data(): ?array
    {
        return $this->data;
    }

    public function isDeleted(): bool
    {
        return null === $this->data;
    }

    public function updatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
