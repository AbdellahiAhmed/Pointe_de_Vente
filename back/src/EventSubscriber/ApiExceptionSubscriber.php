<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            // High priority to intercept before Symfony's default HTML error handler
            KernelEvents::EXCEPTION => ['onKernelException', 200],
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();

        // Only handle API routes
        if (!str_starts_with($request->getPathInfo(), '/api/')) {
            return;
        }

        $exception = $event->getThrowable();
        $statusCode = method_exists($exception, 'getStatusCode')
            ? $exception->getStatusCode()
            : 500;

        // Build a clear error message
        $message = $exception->getMessage();
        if ($statusCode >= 500) {
            // Include the exception class for easier debugging
            $class = (new \ReflectionClass($exception))->getShortName();
            $message = sprintf('[%s] %s', $class, $message);
        }

        $response = new JsonResponse([
            'code' => $statusCode,
            'message' => $message,
        ], $statusCode);

        $event->setResponse($response);
    }
}
