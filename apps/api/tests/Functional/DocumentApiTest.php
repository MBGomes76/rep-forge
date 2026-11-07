<?php

declare(strict_types=1);

namespace App\Tests\Functional;

final class DocumentApiTest extends ApiTestCase
{
    /** @return array<string, mixed> */
    private static function program(string $name = 'PPL'): array
    {
        return [
            'id' => 'prog-1',
            'name' => $name,
            'steps' => [['kind' => 'rest', 'id' => 'r1', 'name' => 'Repos']],
            'schedule' => ['cursor' => 0, 'anchor' => '2026-11-07'],
        ];
    }

    public function testIlFautEtreConnecte(): void
    {
        self::assertSame(401, $this->request('GET', '/api/programs'));
    }

    public function testCreationEnvoiRejoueModificationConflitEtSuppression(): void
    {
        $this->logIn($this->createAccount('alice@example.com'));

        // Création, avec l'identifiant choisi par l'appareil.
        self::assertSame(201, $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 0, 'data' => self::program()]));
        self::assertSame(1, $this->json()['version']);
        $createdRevision = $this->json()['revision'];

        // Même envoi rejoué (réseau coupé avant la réponse) : aucun doublon, rien ne change.
        self::assertSame(200, $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 0, 'data' => self::program()]));
        self::assertSame(1, $this->json()['version']);

        // Modification basée sur la version courante.
        self::assertSame(200, $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 1, 'data' => self::program('Depuis le téléphone')]));
        self::assertSame(2, $this->json()['version']);

        // Un autre appareil, resté en version 1 : conflit, rien n'est écrasé.
        self::assertSame(409, $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 1, 'data' => self::program('Depuis l’ordinateur')]));
        self::assertSame('Ce document a été modifié sur un autre appareil.', $this->json()['error']);
        self::assertSame('Depuis le téléphone', $this->json()['current']['data']['name']);
        self::assertSame(200, $this->request('GET', '/api/programs/prog-1'));
        self::assertSame('Depuis le téléphone', $this->json()['data']['name']);

        // Suppression : une trace reste, pour prévenir les autres appareils.
        self::assertSame(200, $this->request('DELETE', '/api/programs/prog-1?baseVersion=2'));
        self::assertTrue($this->json()['deleted']);
        self::assertSame(3, $this->json()['version']);

        self::assertSame(200, $this->request('GET', "/api/programs?after=$createdRevision"));
        $items = $this->json()['items'];
        self::assertCount(1, $items);
        self::assertSame(['prog-1', true, null], [$items[0]['id'], $items[0]['deleted'], $items[0]['data']]);
        self::assertFalse($this->json()['hasMore']);
    }

    public function testLaListeNeRenvoieQueCeQuiAChangeDepuisUneRevision(): void
    {
        $this->logIn($this->createAccount('alice@example.com'));
        $this->request('PUT', '/api/rest-days/prog-1:2026-11-05', ['baseVersion' => 0, 'data' => ['id' => 'prog-1:2026-11-05', 'programId' => 'prog-1', 'date' => '2026-11-05']]);
        $first = $this->json()['revision'];
        $this->request('PUT', '/api/rest-days/prog-1:2026-11-06', ['baseVersion' => 0, 'data' => ['id' => 'prog-1:2026-11-06', 'programId' => 'prog-1', 'date' => '2026-11-06']]);

        $this->request('GET', '/api/rest-days?after=0');
        self::assertSame(['prog-1:2026-11-05', 'prog-1:2026-11-06'], array_column($this->json()['items'], 'id'));

        $this->request('GET', "/api/rest-days?after=$first");
        self::assertSame(['prog-1:2026-11-06'], array_column($this->json()['items'], 'id'));
    }

    public function testLesDonneesDUnCompteSontInvisiblesPourLesAutres(): void
    {
        $alice = $this->createAccount('alice@example.com');
        $bob = $this->createAccount('bob@example.com');

        $this->logIn($alice);
        $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 0, 'data' => self::program('Programme d’Alice')]);

        $this->logIn($bob);
        self::assertSame(404, $this->request('GET', '/api/programs/prog-1'));
        $this->request('GET', '/api/programs?after=0');
        self::assertSame([], $this->json()['items']);
        self::assertSame(404, $this->request('DELETE', '/api/programs/prog-1?baseVersion=1'));

        // Même identifiant chez Bob : un document à lui, indépendant.
        self::assertSame(201, $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 0, 'data' => self::program('Programme de Bob')]));

        $this->logIn($alice);
        $this->request('GET', '/api/programs/prog-1');
        self::assertSame('Programme d’Alice', $this->json()['data']['name']);
    }

    public function testRefuseLesDocumentsMalFormes(): void
    {
        $this->logIn($this->createAccount('alice@example.com'));

        self::assertSame(422, $this->request('PUT', '/api/programs/prog-1', ['baseVersion' => 0, 'data' => ['id' => 'prog-1']]));
        self::assertStringContainsString('« name »', $this->json()['error']);

        self::assertSame(400, $this->request('PUT', '/api/programs/prog-1', ['data' => self::program()]));
        self::assertStringContainsString('baseVersion', $this->json()['error']);

        self::assertSame(404, $this->request('GET', '/api/inconnus/prog-1'));
    }
}
