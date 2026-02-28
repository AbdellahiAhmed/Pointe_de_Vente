<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactory;

class LoginRateLimitSubscriber implements EventSubscriberInterface
{
    private RateLimiterFactory $loginApiLimiter;

    public function __construct(RateLimiterFactory $loginApiLimiter)
    {
        $this->loginApiLimiter = $loginApiLimiter;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 20],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        if ($request->getPathInfo() !== '/api/auth/login_check') {
            return;
        }

        if ($request->getMethod() !== 'POST') {
            return;
        }

        $ip = $request->getClientIp() ?? 'unknown';
        $limiter = $this->loginApiLimiter->create($ip);
        $limit = $limiter->consume();

        if (!$limit->isAccepted()) {
            $retryAfter = $limit->getRetryAfter()->getTimestamp() - time();
            $event->setResponse(new JsonResponse([
                'error' => 'Too many login attempts. Please try again later.',
                'retryAfter' => max(1, $retryAfter),
            ], 429, [
                'Retry-After' => max(1, $retryAfter),
                'X-RateLimit-Limit' => $limit->getLimit(),
                'X-RateLimit-Remaining' => $limit->getRemainingTokens(),
            ]));
        }
    }
}
