<?php

namespace App\Core\Closing\Command\CloseSessionCommand;

class CloseSessionCommand
{
    /**
     * @var int|null
     */
    private $id;

    /**
     * @var int|null
     */
    private $closedBy;

    /**
     * @var string|null
     */
    private $closingBalance;

    /**
     * @var array|null
     */
    private $denominations;

    /**
     * @return int|null
     */
    public function getId(): ?int
    {
        return $this->id;
    }

    /**
     * @param int|null $id
     */
    public function setId(?int $id): self
    {
        $this->id = $id;
        return $this;
    }

    /**
     * @return int|null
     */
    public function getClosedBy(): ?int
    {
        return $this->closedBy;
    }

    /**
     * @param int|null $closedBy
     */
    public function setClosedBy(?int $closedBy): self
    {
        $this->closedBy = $closedBy;
        return $this;
    }

    /**
     * @return string|null
     */
    public function getClosingBalance(): ?string
    {
        return $this->closingBalance;
    }

    /**
     * @param string|null $closingBalance
     */
    public function setClosingBalance(?string $closingBalance): self
    {
        $this->closingBalance = $closingBalance;
        return $this;
    }

    /**
     * @return array|null
     */
    public function getDenominations(): ?array
    {
        return $this->denominations;
    }

    /**
     * @param array|null $denominations
     */
    public function setDenominations(?array $denominations): self
    {
        $this->denominations = $denominations;
        return $this;
    }
}
