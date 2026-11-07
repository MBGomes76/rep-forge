<?php

declare(strict_types=1);

namespace App\Infrastructure\Security;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\TooManyLoginAttemptsAuthenticationException;
use Symfony\Component\Security\Http\Authentication\AuthenticationFailureHandlerInterface;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;
use Symfony\Component\Security\Http\Event\LogoutEvent;

/**
 * Réponses JSON (en français) de l'authentification, à la place des
 * redirections et messages anglais par défaut de Symfony.
 */
final class JsonAuthenticationHandler implements AuthenticationEntryPointInterface, AuthenticationFailureHandlerInterface
{
    /** Pas connecté : 401, l'application affiche l'écran de connexion. */
    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse(['error' => 'Connexion requise.'], Response::HTTP_UNAUTHORIZED);
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): Response
    {
        if ($exception instanceof TooManyLoginAttemptsAuthenticationException) {
            return new JsonResponse(
                ['error' => 'Trop de tentatives. Réessaie dans quelques minutes.'],
                Response::HTTP_TOO_MANY_REQUESTS,
            );
        }

        // Même message que l'adresse soit inconnue ou le mot de passe faux : on ne révèle pas qui a un compte.
        return new JsonResponse(['error' => 'E-mail ou mot de passe incorrect.'], Response::HTTP_UNAUTHORIZED);
    }

    #[AsEventListener]
    public function onLogout(LogoutEvent $event): void
    {
        $event->setResponse(new Response(status: Response::HTTP_NO_CONTENT));
    }
}
