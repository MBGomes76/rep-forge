<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain\Sync;

use App\Domain\Shared\DomainException;
use App\Domain\Sync\DocumentType;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class DocumentTypeTest extends TestCase
{
    /** @return iterable<string, array{DocumentType, string, array<mixed>}> */
    public static function validPayloads(): iterable
    {
        yield 'programme' => [DocumentType::Program, 'p1', [
            'id' => 'p1', 'name' => 'PPL', 'steps' => [], 'schedule' => ['cursor' => 0, 'anchor' => '2026-11-07'],
        ]];
        yield 'séance' => [DocumentType::Workout, 'w1', [
            'id' => 'w1', 'programId' => 'p1', 'stepId' => 's1', 'name' => 'Push',
            'startedAt' => '2026-11-07T18:00:00.000Z', 'finishedAt' => null, 'exercises' => [],
        ]];
        yield 'jour de repos' => [DocumentType::RestDay, 'p1:2026-11-06', ['id' => 'p1:2026-11-06', 'programId' => 'p1', 'date' => '2026-11-06']];
        yield 'réglage' => [DocumentType::Setting, 'activeProgramId', ['value' => 'p1']];
    }

    /** @param array<mixed> $data */
    #[DataProvider('validPayloads')]
    public function testAccepteLesDocumentsBienFormes(DocumentType $type, string $id, array $data): void
    {
        $this->expectNotToPerformAssertions();
        $type->assertValidPayload($id, $data);
    }

    /** @return iterable<string, array{DocumentType, string, array<mixed>, string}> */
    public static function invalidPayloads(): iterable
    {
        yield 'identifiant différent de l’adresse' => [DocumentType::Program, 'p1', [
            'id' => 'p2', 'name' => 'PPL', 'steps' => [], 'schedule' => ['cursor' => 0, 'anchor' => '2026-11-07'],
        ], 'l’identifiant ne correspond pas'];
        yield 'étapes qui ne sont pas une liste' => [DocumentType::Program, 'p1', [
            'id' => 'p1', 'name' => 'PPL', 'steps' => ['a' => 1], 'schedule' => ['cursor' => 0, 'anchor' => '2026-11-07'],
        ], '« steps »'];
        yield 'date prévue mal formée' => [DocumentType::Program, 'p1', [
            'id' => 'p1', 'name' => 'PPL', 'steps' => [], 'schedule' => ['cursor' => 0, 'anchor' => 'demain'],
        ], '« schedule »'];
        yield 'séance sans exercices' => [DocumentType::Workout, 'w1', [
            'id' => 'w1', 'programId' => 'p1', 'stepId' => 's1', 'name' => 'Push', 'startedAt' => 'x',
        ], '« exercises »'];
        yield 'réglage sans valeur' => [DocumentType::Setting, 'activeProgramId', [], '« value »'];
    }

    /** @param array<mixed> $data */
    #[DataProvider('invalidPayloads')]
    public function testRefuseLesDocumentsMalFormes(DocumentType $type, string $id, array $data, string $message): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage($message);
        $type->assertValidPayload($id, $data);
    }
}
