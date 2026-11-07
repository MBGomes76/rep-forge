<?php

declare(strict_types=1);

namespace App\UI\Http\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\UnsupportedMediaTypeHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Protection contre la falsification de requêtes (CSRF), en plus du cookie SameSite=Lax :
 * un autre site peut faire envoyer un formulaire classique au navigateur, mais pas une
 * requête JSON sans autorisation CORS. Exiger du JSON ferme donc cette porte.
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 256)]
final class RequireJsonListener
{
    private const METHODS_WITH_BODY = [Request::METHOD_POST, Request::METHOD_PUT, Request::METHOD_PATCH];

    public function __invoke(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest()
            || !str_starts_with($request->getPathInfo(), '/api')
            || !\in_array($request->getMethod(), self::METHODS_WITH_BODY, true)) {
            return;
        }
        if ('json' !== $request->getContentTypeFormat()) {
            throw new UnsupportedMediaTypeHttpException('Les requêtes doivent être envoyées en JSON (Content-Type: application/json).');
        }
    }
}
