<?php

namespace App\Entity;

use ApiPlatform\Core\Annotation\ApiResource;
use App\Entity\Traits\TimestampableTrait;
use App\Entity\Traits\UuidTrait;
use App\Repository\ReturnRequestRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Symfony\Component\Serializer\Annotation\Groups;
use ApiPlatform\Core\Annotation\ApiFilter;
use ApiPlatform\Core\Bridge\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Core\Bridge\Doctrine\Orm\Filter\OrderFilter;

/**
 * @ORM\Entity(repositoryClass=ReturnRequestRepository::class)
 * @ApiResource(
 *     normalizationContext={"groups"={"return_request.read", "time.read", "uuid.read"}},
 *     denormalizationContext={"groups"={"return_request.write"}}
 * )
 * @ApiFilter(filterClass=SearchFilter::class, properties={"status": "exact", "order.orderId": "exact"})
 * @ApiFilter(filterClass=OrderFilter::class, properties={"createdAt"})
 */
class ReturnRequest
{
    use TimestampableTrait;
    use UuidTrait;

    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     * @Groups({"return_request.read"})
     */
    private $id;

    /**
     * @ORM\ManyToOne(targetEntity=Order::class)
     * @ORM\JoinColumn(nullable=false)
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $order;

    /**
     * @ORM\ManyToOne(targetEntity=User::class)
     * @ORM\JoinColumn(nullable=false)
     * @Groups({"return_request.read"})
     */
    private $requestedBy;

    /**
     * @ORM\ManyToOne(targetEntity=User::class)
     * @Groups({"return_request.read"})
     */
    private $approvedBy;

    /**
     * @ORM\Column(type="string", length=20)
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $status = 'PENDING';

    /**
     * @ORM\OneToMany(targetEntity=ReturnRequestItem::class, mappedBy="returnRequest", cascade={"persist", "remove"})
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $items;

    /**
     * @ORM\Column(type="text", nullable=true)
     * @Groups({"return_request.read", "return_request.write"})
     */
    private $reason;

    /**
     * @ORM\ManyToOne(targetEntity=Store::class)
     * @Groups({"return_request.read"})
     */
    private $store;

    public function __construct()
    {
        $this->items = new ArrayCollection();
        $this->uuid = Uuid::uuid4();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOrder(): ?Order
    {
        return $this->order;
    }

    public function setOrder(?Order $order): self
    {
        $this->order = $order;

        return $this;
    }

    public function getRequestedBy(): ?User
    {
        return $this->requestedBy;
    }

    public function setRequestedBy(?User $requestedBy): self
    {
        $this->requestedBy = $requestedBy;

        return $this;
    }

    public function getApprovedBy(): ?User
    {
        return $this->approvedBy;
    }

    public function setApprovedBy(?User $approvedBy): self
    {
        $this->approvedBy = $approvedBy;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    /**
     * @return Collection|ReturnRequestItem[]
     */
    public function getItems(): Collection
    {
        return $this->items;
    }

    public function addItem(ReturnRequestItem $item): self
    {
        if (!$this->items->contains($item)) {
            $this->items[] = $item;
            $item->setReturnRequest($this);
        }

        return $this;
    }

    public function removeItem(ReturnRequestItem $item): self
    {
        if ($this->items->removeElement($item)) {
            // set the owning side to null (unless already changed)
            if ($item->getReturnRequest() === $this) {
                $item->setReturnRequest(null);
            }
        }

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

    public function getStore(): ?Store
    {
        return $this->store;
    }

    public function setStore(?Store $store): self
    {
        $this->store = $store;

        return $this;
    }
}
