<?php

namespace App\Core\Closing\Command\CloseSessionCommand;

use App\Core\Cqrs\Traits\CqrsResultEntityNotFoundTrait;
use App\Core\Cqrs\Traits\CqrsResultValidationTrait;
use App\Entity\Closing;

class CloseSessionCommandResult
{
    use CqrsResultEntityNotFoundTrait, CqrsResultValidationTrait;

    /**
     * @var Closing|null
     */
    private $closing;

    /**
     * @var bool
     */
    private $alreadyClosed = false;

    /**
     * @return Closing|null
     */
    public function getClosing(): ?Closing
    {
        return $this->closing;
    }

    /**
     * @param Closing|null $closing
     */
    public function setClosing(?Closing $closing): void
    {
        $this->closing = $closing;
    }

    /**
     * @return bool
     */
    public function isAlreadyClosed(): bool
    {
        return $this->alreadyClosed;
    }

    public static function createAlreadyClosed(): self
    {
        $result = new self();
        $result->alreadyClosed = true;
        $result->validationErrorMessage = 'Session already closed';

        return $result;
    }
}
