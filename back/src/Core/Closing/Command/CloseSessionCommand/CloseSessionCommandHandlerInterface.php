<?php

namespace App\Core\Closing\Command\CloseSessionCommand;

interface CloseSessionCommandHandlerInterface
{
    public function handle(CloseSessionCommand $command): CloseSessionCommandResult;
}
