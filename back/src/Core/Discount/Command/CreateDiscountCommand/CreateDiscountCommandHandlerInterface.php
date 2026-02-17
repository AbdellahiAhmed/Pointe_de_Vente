<?php

namespace App\Core\Discount\Command\CreateDiscountCommand;

interface CreateDiscountCommandHandlerInterface
{
    public function handle(CreateDiscountCommand $command): CreateDiscountCommandResult;
}