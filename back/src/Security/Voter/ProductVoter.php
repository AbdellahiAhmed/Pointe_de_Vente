<?php

declare(strict_types=1);

namespace App\Security\Voter;

use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Security;

class ProductVoter extends Voter
{
    public const VIEW = 'PRODUCT_VIEW';
    public const MANAGE = 'PRODUCT_MANAGE';

    private Security $security;

    public function __construct(Security $security)
    {
        $this->security = $security;
    }

    protected function supports(string $attribute, $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::MANAGE]);
    }

    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        return match ($attribute) {
            self::VIEW => $this->security->isGranted('ROLE_VENDEUR'),
            self::MANAGE => $this->security->isGranted('ROLE_MANAGER'),
            default => false,
        };
    }
}
