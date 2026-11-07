<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

final class AccountApiTest extends ApiTestCase
{
    private function invite(string $email): CommandTester
    {
        $command = (new Application(static::$kernel))->find('app:invite');
        $tester = new CommandTester($command);
        $tester->execute(['email' => $email]);

        return $tester;
    }

    public function testParcoursCompletInvitationCreationDuCompteConnexion(): void
    {
        $tester = $this->invite('Ami@Example.com');
        $tester->assertCommandIsSuccessful();
        self::assertSame(1, preg_match('#http://localhost:5173/invitation/([A-Za-z0-9_-]{43})#', $tester->getDisplay(), $match));
        $token = $match[1];

        // Le formulaire affiche l'adresse invitée.
        self::assertSame(200, $this->request('GET', "/api/invitations/$token"));
        self::assertSame(['email' => 'ami@example.com'], $this->json());

        self::assertSame(422, $this->request('POST', "/api/invitations/$token/accept", ['password' => 'court']));
        self::assertSame('Le mot de passe doit contenir au moins 10 caractères.', $this->json()['error']);

        // Compte créé, et connecté dans la foulée.
        self::assertSame(201, $this->request('POST', "/api/invitations/$token/accept", ['password' => 'phrase-de-passe-solide']));
        self::assertSame(200, $this->request('GET', '/api/me'));
        self::assertSame('ami@example.com', $this->json()['email']);

        // Le lien ne sert qu'une fois.
        self::assertSame(404, $this->request('GET', "/api/invitations/$token"));
        self::assertSame(422, $this->request('POST', "/api/invitations/$token/accept", ['password' => 'une-autre-phrase']));
        self::assertSame('Cette invitation a déjà été utilisée.', $this->json()['error']);

        self::assertSame(204, $this->request('POST', '/api/logout'));
        self::assertSame(401, $this->request('GET', '/api/me'));
        self::assertSame('Connexion requise.', $this->json()['error']);

        self::assertSame(401, $this->request('POST', '/api/login', ['email' => 'ami@example.com', 'password' => 'mauvais-mot-de-passe']));
        self::assertSame('E-mail ou mot de passe incorrect.', $this->json()['error']);

        self::assertSame(200, $this->request('POST', '/api/login', ['email' => 'ami@example.com', 'password' => 'phrase-de-passe-solide']));
        self::assertSame('ami@example.com', $this->json()['email']);
        self::assertSame(200, $this->request('GET', '/api/me'));
    }

    public function testUneAdresseInconnueDonneLeMemeMessageQuUnMauvaisMotDePasse(): void
    {
        self::assertSame(401, $this->request('POST', '/api/login', ['email' => 'inconnu@example.com', 'password' => 'peu-importe-ici']));
        self::assertSame('E-mail ou mot de passe incorrect.', $this->json()['error']);
    }

    public function testBloqueApresCinqEssaisRates(): void
    {
        $this->createAccount('cible@example.com');
        for ($i = 0; $i < 5; ++$i) {
            $this->request('POST', '/api/login', ['email' => 'cible@example.com', 'password' => 'essai-numero-'.$i]);
        }

        self::assertSame(429, $this->request('POST', '/api/login', ['email' => 'cible@example.com', 'password' => 'phrase-de-passe-solide']));
        self::assertSame('Trop de tentatives. Réessaie dans quelques minutes.', $this->json()['error']);
    }

    public function testOnNInviteQuUneFoisLaMemeAdresse(): void
    {
        $this->createAccount('deja@example.com');

        $tester = $this->invite('deja@example.com');
        self::assertSame(1, $tester->getStatusCode());
        self::assertStringContainsString('Un compte existe déjà pour cette adresse.', $tester->getDisplay());
    }

    public function testRefuseLesRequetesQuiNeSontPasEnJson(): void
    {
        // Un formulaire envoyé depuis un autre site (CSRF) ne passe pas.
        $this->client->request('POST', '/api/login', ['email' => 'a@example.com', 'password' => 'x']);
        self::assertSame(415, $this->client->getResponse()->getStatusCode());
    }
}
