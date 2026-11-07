<?php

declare(strict_types=1);

namespace App\UI\Http\Controller;

use App\Application\Account\AcceptInvitation;
use App\Application\Account\FindInvitation;
use App\Infrastructure\Security\SecurityUser;
use App\UI\Http\JsonBody;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api')]
final class AccountController extends AbstractController
{
    /** Le formulaire d'invitation affiche l'adresse invitée, si le lien est encore valable. */
    #[Route('/invitations/{token}', methods: ['GET'])]
    public function invitation(string $token, FindInvitation $findInvitation): JsonResponse
    {
        return $this->json(['email' => $findInvitation($token)->value]);
    }

    /** L'invité choisit son mot de passe : compte créé, et connecté dans la foulée. */
    #[Route('/invitations/{token}/accept', methods: ['POST'])]
    public function acceptInvitation(string $token, Request $request, AcceptInvitation $acceptInvitation, Security $security): JsonResponse
    {
        $password = JsonBody::string(JsonBody::decode($request), 'password');
        $user = SecurityUser::fromUser($acceptInvitation($token, $password));
        $security->login($user, 'json_login', 'api');

        return $this->json(self::me($user), Response::HTTP_CREATED);
    }

    /** Point d'arrivée de json_login une fois l'authentification réussie. */
    #[Route('/login', methods: ['POST'])]
    public function login(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        return $this->json(self::me($user));
    }

    #[Route('/me', methods: ['GET'])]
    public function currentUser(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        return $this->json(self::me($user));
    }

    /** @return array{id: string, email: string} */
    private static function me(SecurityUser $user): array
    {
        return ['id' => $user->id, 'email' => $user->getUserIdentifier()];
    }
}
