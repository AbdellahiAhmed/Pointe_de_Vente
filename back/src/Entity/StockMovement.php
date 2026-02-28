<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

/**
 * @ORM\Entity()
 * @ORM\Table(indexes={
 *     @ORM\Index(name="idx_sm_product", columns={"product_id"}),
 *     @ORM\Index(name="idx_sm_type", columns={"type"}),
 *     @ORM\Index(name="idx_sm_created", columns={"created_at"})
 * })
 */
class StockMovement
{
    public const TYPE_SALE = 'sale';
    public const TYPE_PURCHASE = 'purchase';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_RETURN = 'return';
    public const TYPE_DAMAGE = 'damage';
    public const TYPE_LOSS = 'loss';

    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\ManyToOne(targetEntity=Product::class)
     * @ORM\JoinColumn(nullable=false)
     */
    private $product;

    /**
     * @ORM\ManyToOne(targetEntity=ProductStore::class)
     * @ORM\JoinColumn(nullable=true)
     */
    private $productStore;

    /**
     * @ORM\ManyToOne(targetEntity=Store::class)
     * @ORM\JoinColumn(nullable=true)
     */
    private $store;

    /**
     * @ORM\Column(type="decimal", precision=10, scale=2)
     */
    private $quantityBefore;

    /**
     * @ORM\Column(type="decimal", precision=10, scale=2)
     */
    private $quantityAfter;

    /**
     * @ORM\Column(type="decimal", precision=10, scale=2)
     */
    private $quantityChanged;

    /**
     * @ORM\Column(type="string", length=20)
     */
    private $type;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $reference;

    /**
     * @ORM\Column(type="string", length=500, nullable=true)
     */
    private $reason;

    /**
     * @ORM\ManyToOne(targetEntity=User::class)
     * @ORM\JoinColumn(nullable=true)
     */
    private $user;

    /**
     * @ORM\Column(type="datetime")
     */
    private $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProduct(): ?Product
    {
        return $this->product;
    }

    public function setProduct(?Product $product): self
    {
        $this->product = $product;
        return $this;
    }

    public function getProductStore(): ?ProductStore
    {
        return $this->productStore;
    }

    public function setProductStore(?ProductStore $productStore): self
    {
        $this->productStore = $productStore;
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

    public function getQuantityBefore(): ?string
    {
        return $this->quantityBefore;
    }

    public function setQuantityBefore(string $quantityBefore): self
    {
        $this->quantityBefore = $quantityBefore;
        return $this;
    }

    public function getQuantityAfter(): ?string
    {
        return $this->quantityAfter;
    }

    public function setQuantityAfter(string $quantityAfter): self
    {
        $this->quantityAfter = $quantityAfter;
        return $this;
    }

    public function getQuantityChanged(): ?string
    {
        return $this->quantityChanged;
    }

    public function setQuantityChanged(string $quantityChanged): self
    {
        $this->quantityChanged = $quantityChanged;
        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(?string $reference): self
    {
        $this->reference = $reference;
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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;
        return $this;
    }
}
