<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Doctrine;

use App\Application\Port\TransactionManager;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineTransactionManager implements TransactionManager
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function transactional(\Closure $work): mixed
    {
        // Ouvre une transaction, exécute, enregistre (flush) puis valide ; annule tout en cas d'exception.
        return $this->entityManager->wrapInTransaction($work);
    }
}
