<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception as DbalException;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/** Moindre privilège : l'application lit et écrit les données, mais ne peut pas toucher au schéma. */
final class DatabasePrivilegesTest extends KernelTestCase
{
    public function testLaConnexionDeLApplicationNePeutPasSupprimerDeTable(): void
    {
        /** @var Connection $connection */
        $connection = static::getContainer()->get('doctrine.dbal.default_connection');

        self::assertSame('repforge_user', $connection->fetchOne('SELECT current_user'));
        $this->expectException(DbalException::class);
        $connection->executeStatement('DROP TABLE document');
    }
}
