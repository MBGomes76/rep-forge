<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Application\Account\AcceptInvitation;
use App\Application\Account\InviteUser;
use App\Domain\Account\User;
use App\Infrastructure\Security\SecurityUser;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Tests de l'API de bout en bout : vraie base PostgreSQL (repforge_test), vrais rôles.
 * Chaque test est annulé à la fin (DAMA), la base reste vide.
 */
abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        // Compteurs anti-essais répétés remis à zéro : chaque test part d'un état connu.
        static::getContainer()->get('cache.rate_limiter')->clear();
    }

    /** Crée un compte par le vrai parcours d'invitation. */
    protected function createAccount(string $email, string $password = 'phrase-de-passe-solide'): User
    {
        $container = static::getContainer();
        $invitation = $container->get(InviteUser::class)($email);

        return $container->get(AcceptInvitation::class)($invitation->token, $password);
    }

    protected function logIn(User $user): void
    {
        $this->client->loginUser(SecurityUser::fromUser($user), 'api');
    }

    /** @param array<mixed>|null $body */
    protected function request(string $method, string $uri, ?array $body = null): int
    {
        $this->client->request(
            $method,
            $uri,
            server: ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'],
            content: null === $body ? null : json_encode($body, \JSON_THROW_ON_ERROR),
        );

        return $this->client->getResponse()->getStatusCode();
    }

    /** @return array<mixed> */
    protected function json(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
    }
}
