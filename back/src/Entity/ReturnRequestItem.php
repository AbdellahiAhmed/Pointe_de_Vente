<?php

namespace App\Entity;

use ApiPlatform\Core\Annotation\ApiResource;
use App\Repository\ReturnRequestItemRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

/**
 * @ORM\Entity(repositoryClass=ReturnRequestItemRepository::class)
 * @ApiResource(
 *     normalizationContext={"groups"={"return_request_item.read", "return_request.read"}},
 *     denormalizationContext={"groups"={"return_request_item.write", "return_request.write"}},
 *     collectionOperations={
 *         "get"={"access_control"="is_granted('ROLE_MANAGER')"},
 *         "post"={"access_control"="is_granted('ROLE_MANAGER')"}
 *     },
 *     itemOperations={
 *         "get"={"access_control"="is_granted('ROLE_MANAGER')"},
 *         "put"={"access_control"="is_granted('ROLE_MANAGER')"},
 *         "delete"={"access_control"="is_granted('ROLE_MANAGER')"}
 *     }
 * )
 */
class ReturnRequestItem
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     * @Groups({"return_request.read", "return_request_item.read"})
     */
    private $id;

    /**
     * @ORM\ManyToOne(targetEntity=ReturnRequest::class, inversedBy="items")
     * @ORM\JoinColumn(nullable=false)
     */
    private $returnRequest;

    /**
     * @ORM\ManyToOne(targetEntity=OrderProduct::class)
     * @ORM\JoinColumn(nullable=false)
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $orderProduct;

    /**
     * @ORM\Column(type="integer")
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $quantity;

    /**
     * @ORM\Column(type="text", nullable=true)
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $reason;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReturnRequest(): ?ReturnRequest
    {
        return $this->returnRequest;
    }

    public function setReturnRequest(?ReturnRequest $returnRequest): self
    {
        $this->returnRequest = $returnRequest;

        return $this;
    }

    public function getOrderProduct(): ?OrderProduct
    {
        return $this->orderProduct;
    }

    public function setOrderProduct(?OrderProduct $orderProduct): self
    {
        $this->orderProduct = $orderProduct;

        return $this;
    }

    public function getQuantity(): ?int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): self
    {
        $this->quantity = $quantity;

        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): self
    {
        $this->reason = $reason;

        return $this;
    }
}
