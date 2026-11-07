<?php

declare(strict_types=1);

namespace App\UI\Http\Controller;

use App\Application\Sync\DeleteDocument;
use App\Application\Sync\DocumentWrite;
use App\Application\Sync\GetDocument;
use App\Application\Sync\ListChanges;
use App\Application\Sync\PutDocument;
use App\Domain\Sync\DocumentType;
use App\Domain\Sync\WriteOutcome;
use App\Infrastructure\Security\SecurityUser;
use App\UI\Http\DocumentView;
use App\UI\Http\JsonBody;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Une ressource REST par type de données, toutes sur le même modèle :
 *
 *   GET    /api/programs?after=N  ce qui a changé après la révision N
 *   GET    /api/programs/{id}
 *   PUT    /api/programs/{id}     {"baseVersion": 0, "data": {...}}  création ou modification
 *   DELETE /api/programs/{id}?baseVersion=N
 *
 * Toujours limité au compte connecté.
 */
#[Route('/api/{collection}', requirements: ['collection' => 'programs|workouts|rest-days|settings'])]
final class DocumentController extends AbstractController
{
    private const TYPES = [
        'programs' => DocumentType::Program,
        'workouts' => DocumentType::Workout,
        'rest-days' => DocumentType::RestDay,
        'settings' => DocumentType::Setting,
    ];

    #[Route('', methods: ['GET'])]
    public function changes(string $collection, Request $request, #[CurrentUser] SecurityUser $user, ListChanges $listChanges): JsonResponse
    {
        $page = $listChanges($user->id, self::TYPES[$collection], $request->query->getInt('after'));

        return $this->json([
            'items' => array_map(DocumentView::of(...), $page['documents']),
            'hasMore' => $page['hasMore'],
        ]);
    }

    #[Route('/{id}', methods: ['GET'])]
    public function show(string $collection, string $id, #[CurrentUser] SecurityUser $user, GetDocument $getDocument): JsonResponse
    {
        return $this->json(DocumentView::of($getDocument($user->id, self::TYPES[$collection], $id)));
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function put(string $collection, string $id, Request $request, #[CurrentUser] SecurityUser $user, PutDocument $putDocument): JsonResponse
    {
        $body = JsonBody::decode($request);
        $data = $body['data'] ?? null;
        if (!\is_array($data)) {
            throw new BadRequestHttpException('Champ « data » manquant : il doit contenir le document.');
        }

        return self::written($putDocument($user->id, self::TYPES[$collection], $id, self::baseVersion($body['baseVersion'] ?? null), $data));
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(string $collection, string $id, Request $request, #[CurrentUser] SecurityUser $user, DeleteDocument $deleteDocument): JsonResponse
    {
        $baseVersion = self::baseVersion(filter_var($request->query->get('baseVersion'), \FILTER_VALIDATE_INT, \FILTER_NULL_ON_FAILURE));

        return self::written($deleteDocument($user->id, self::TYPES[$collection], $id, $baseVersion));
    }

    private static function baseVersion(mixed $value): int
    {
        if (!\is_int($value) || $value < 0) {
            throw new BadRequestHttpException('Champ « baseVersion » manquant : la version sur laquelle l’appareil s’est basé (0 pour une création).');
        }

        return $value;
    }

    /** 201 pour une création, 200 sinon (y compris un envoi rejoué, sans effet). */
    private static function written(DocumentWrite $write): JsonResponse
    {
        $status = WriteOutcome::Created === $write->outcome ? Response::HTTP_CREATED : Response::HTTP_OK;

        return new JsonResponse(DocumentView::of($write->document), $status);
    }
}
