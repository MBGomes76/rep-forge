<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Doctrine;

use App\Domain\Account\Invitation;
use App\Domain\Account\InvitationRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineInvitationRepository implements InvitationRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    public function save(Invitation $invitation): void
    {
        $this->entityManager->persist($invitation);
        $this->entityManager->flush();
    }

    public function findByToken(string $token): ?Invitation
    {
        return $this->entityManager->getRepository(Invitation::class)
            ->findOneBy(['tokenHash' => Invitation::hashToken($token)]);
    }
}
