<?php

declare(strict_types=1);

namespace App\UI\Http\EventListener;

use App\Domain\Shared\DomainException;
use App\Domain\Shared\NotFound;
use App\Domain\Sync\VersionConflict;
use App\UI\Http\DocumentView;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Toutes les erreurs de l'API en JSON : `{"error": "message en français"}`.
 * Les erreurs inattendues (500) ne révèlent rien de l'intérieur du serveur.
 */
#[AsEventListener]
final readonly class ApiExceptionListener
{
    public function __construct(#[Autowire('%kernel.debug%')] private bool $debug)
    {
    }

    public function __invoke(ExceptionEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api')) {
            return;
        }
        $exception = $event->getThrowable();

        $response = match (true) {
            // Conflit : on joint la version du serveur, pour que l'appareil propose de choisir.
            $exception instanceof VersionConflict => new JsonResponse(
                ['error' => $exception->getMessage(), 'current' => DocumentView::of($exception->current)],
                Response::HTTP_CONFLICT,
            ),
            $exception instanceof NotFound => new JsonResponse(['error' => $exception->getMessage()], Response::HTTP_NOT_FOUND),
            $exception instanceof DomainException => new JsonResponse(['error' => $exception->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY),
            $exception instanceof HttpExceptionInterface => new JsonResponse(
                ['error' => $exception->getMessage() ?: Response::$statusTexts[$exception->getStatusCode()] ?? 'Erreur'],
                $exception->getStatusCode(),
                $exception->getHeaders(),
            ),
            default => null,
        };

        // En dev, on laisse Symfony afficher le détail de l'erreur.
        if (null === $response && !$this->debug) {
            $response = new JsonResponse(['error' => 'Erreur inattendue du serveur.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
        if (null !== $response) {
            $event->setResponse($response);
        }
    }
}
