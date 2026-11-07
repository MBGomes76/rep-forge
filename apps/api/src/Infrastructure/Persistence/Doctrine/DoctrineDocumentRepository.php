<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Doctrine;

use App\Domain\Sync\Document;
use App\Domain\Sync\DocumentRepository;
use App\Domain\Sync\DocumentType;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineDocumentRepository implements DocumentRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function find(string $ownerId, DocumentType $type, string $id): ?Document
    {
        return $this->entityManager->find(Document::class, ['ownerId' => $ownerId, 'type' => $type, 'id' => $id]);
    }

    public function save(Document $document): void
    {
        $this->entityManager->persist($document);
        $this->entityManager->flush();
    }

    public function changedAfter(string $ownerId, DocumentType $type, int $afterRevision, int $limit): array
    {
        /** @var list<Document> */
        return $this->entityManager->createQueryBuilder()
            ->select('d')
            ->from(Document::class, 'd')
            ->where('d.ownerId = :owner AND d.type = :type AND d.revision > :after')
            ->orderBy('d.revision', 'ASC')
            ->setMaxResults($limit)
            ->setParameter('owner', $ownerId)
            ->setParameter('type', $type)
            ->setParameter('after', $afterRevision)
            ->getQuery()
            ->getResult();
    }

    public function nextRevision(): int
    {
        return (int) $this->entityManager->getConnection()->fetchOne("SELECT nextval('document_revision_seq')");
    }

    public function lock(string $ownerId, DocumentType $type, string $id): void
    {
        // Verrou PostgreSQL « consultatif », libéré automatiquement à la fin de la transaction.
        $this->entityManager->getConnection()->executeQuery(
            'SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))',
            ['key' => $ownerId.'/'.$type->value.'/'.$id],
        );
    }
}
