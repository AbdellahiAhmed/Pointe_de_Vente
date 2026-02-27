<?php


namespace App\Core\Dto\Controller\Api\Admin\Customer;


use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Validator\Constraints as Assert;

class CreateCustomerPaymentRequestDto
{
    /**
     * @var float|null
     * @Assert\NotBlank(normalizer="trim")
     * @Assert\Positive(message="Le montant du paiement doit être supérieur à zéro.")
     */
    private $amount;

    /**
     * @var string|null
     */
    private $description;

    /**
     * @var int|null
     */
    private $orderId;

    /**
     * @var int|null
     */
    private $paymentTypeId;


    public static function createFromRequest(Request $request): self
    {
        $dto = new self();
        $data = json_decode($request->getContent(), true);

        $dto->amount = $data['amount'] ?? null;
        $dto->description = $data['description'] ?? null;
        $dto->orderId = $data['orderId'] ?? null;
        $dto->paymentTypeId = isset($data['paymentTypeId']) ? (int) $data['paymentTypeId'] : null;

        return $dto;
    }

    /**
     * @return float|null
     */
    public function getAmount(): ?float
    {
        return $this->amount;
    }

    /**
     * @param float|null $amount
     */
    public function setAmount(?float $amount): void
    {
        $this->amount = $amount;
    }

    /**
     * @return string|null
     */
    public function getDescription(): ?string
    {
        return $this->description;
    }

    /**
     * @param string|null $description
     */
    public function setDescription(?string $description): void
    {
        $this->description = $description;
    }

    /**
     * @return int|null
     */
    public function getOrderId(): ?int
    {
        return $this->orderId;
    }

    /**
     * @param int|null $orderId
     */
    public function setOrderId(?int $orderId): void
    {
        $this->orderId = $orderId;
    }

    /**
     * @return int|null
     */
    public function getPaymentTypeId(): ?int
    {
        return $this->paymentTypeId;
    }

    /**
     * @param int|null $paymentTypeId
     */
    public function setPaymentTypeId(?int $paymentTypeId): void
    {
        $this->paymentTypeId = $paymentTypeId;
    }

}