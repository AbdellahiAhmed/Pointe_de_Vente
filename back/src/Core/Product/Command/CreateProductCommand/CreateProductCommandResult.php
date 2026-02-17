<?php

namespace App\Core\Product\Command\CreateProductCommand;

use App\Core\Cqrs\Traits\CqrsResultEntityNotFoundTrait;
use App\Core\Cqrs\Traits\CqrsResultValidationTrait;
use App\Entity\Product;

class CreateProductCommandResult
{
    use CqrsResultValidationTrait;
    use CqrsResultEntityNotFoundTrait;

    private Product $product;
    
    public function setProduct(Product $product): self
    {
        $this->product = $product;
        return $this;
    }
    
    public function getProduct(): Product
    {
        return $this->product;
    }
}