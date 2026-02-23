<?php

namespace App\Doctrine;

use Gedmo\Loggable\LoggableListener;

/**
 * Extends the Gedmo LoggableListener to gracefully handle
 * non-string usernames (e.g., security Token objects) instead of throwing.
 */
class SafeLoggableListener extends LoggableListener
{
    public function setUsername($username)
    {
        if (is_string($username)) {
            parent::setUsername($username);
        } elseif (is_object($username)) {
            if (method_exists($username, 'getUserIdentifier')) {
                parent::setUsername((string) $username->getUserIdentifier());
            } elseif (method_exists($username, 'getUsername')) {
                parent::setUsername((string) $username->getUsername());
            } elseif (method_exists($username, 'getUser')) {
                // Handle Symfony Token objects passed by stof bundle
                $user = $username->getUser();
                if (is_object($user) && method_exists($user, 'getUserIdentifier')) {
                    parent::setUsername((string) $user->getUserIdentifier());
                } elseif (is_string($user)) {
                    parent::setUsername($user);
                }
                // else: silently ignore
            } elseif (method_exists($username, '__toString')) {
                parent::setUsername($username->__toString());
            }
            // else: silently ignore invalid objects
        }
        // else: silently ignore null/other types
    }
}
