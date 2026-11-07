<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain\Account;

use App\Domain\Account\Email;
use App\Domain\Account\Invitation;
use App\Domain\Account\PasswordPolicy;
use App\Domain\Shared\DomainException;
use PHPUnit\Framework\TestCase;

final class InvitationTest extends TestCase
{
    private \DateTimeImmutable $now;

    protected function setUp(): void
    {
        $this->now = new \DateTimeImmutable('2026-11-07 10:00:00');
    }

    private function invitation(): Invitation
    {
        return Invitation::issue('inv-1', Email::fromString('ami@example.com'), 'jeton-secret', $this->now);
    }

    public function testEstUtilisableSeptJours(): void
    {
        $invitation = $this->invitation();

        self::assertTrue($invitation->isUsable($this->now->modify('+6 days 23 hours')));
        self::assertFalse($invitation->isUsable($this->now->modify('+7 days')));
    }

    public function testNeSertQuUneFois(): void
    {
        $invitation = $this->invitation();
        $invitation->accept($this->now->modify('+1 hour'));

        self::assertFalse($invitation->isUsable($this->now->modify('+2 hours')));
        $this->expectExceptionObject(new DomainException('Cette invitation a déjà été utilisée.'));
        $invitation->accept($this->now->modify('+2 hours'));
    }

    public function testEstRefuseeUneFoisExpiree(): void
    {
        $this->expectExceptionObject(new DomainException('Cette invitation a expiré. Demande un nouveau lien.'));
        $this->invitation()->accept($this->now->modify('+8 days'));
    }

    public function testNeConserveQueLEmpreinteDuJeton(): void
    {
        self::assertSame(hash('sha256', 'jeton-secret'), Invitation::hashToken('jeton-secret'));
        self::assertNotSame('jeton-secret', Invitation::hashToken('jeton-secret'));
    }

    public function testNormaliseLAdresseEMail(): void
    {
        self::assertSame('ami@example.com', Email::fromString('  Ami@Example.COM ')->value);
        $this->expectException(DomainException::class);
        Email::fromString('pas-une-adresse');
    }

    public function testExigeUnMotDePasseDAuMoinsDixCaracteres(): void
    {
        PasswordPolicy::assertAcceptable('dix-carac!');
        $this->expectExceptionObject(new DomainException('Le mot de passe doit contenir au moins 10 caractères.'));
        PasswordPolicy::assertAcceptable('court');
    }
}
