<?php

namespace App\Core\Dto\Controller\Api\Admin\Customer;

use App\Core\Customer\Command\UpdateCustomerCommand\UpdateCustomerCommand;
use Symfony\Component\HttpFoundation\Request;

class UpdateCustomerRequestDto
{
    /**
     * @var null|int
     */
    private $id = null;

    /**
     * @var null|string
     */
    private $name = null;

    /**
     * @var null|string
     */
    private $email = null;

    /**
     * @var null|string
     */
    private $phone = null;

    /**
     * @var null|\DateTimeInterface
     */
    private $birthday = null;

    /**
     * @var null|string
     */
    private $address = null;

    /**
     * @var null|float
     */
    private $lat = null;

    /**
     * @var null|float
     */
    private $lng = null;

    /**
     * @var null|string
     */
    private $cnic = null;

    /**
     * @var string|null
     */
    private $openingBalance;

    /**
     * @var bool|null
     */
    private $allowCreditSale;

    /**
     * @var string|null
     */
    private $creditLimit;

    public function setId(?int $id)
    {
        $this->id = $id;
        return $this;
    }

    public function getId()
    {
        return $this->id;
    }

    public function setName(?string $name)
    {
        $this->name = $name;
        return $this;
    }

    public function getName()
    {
        return $this->name;
    }

    public function setEmail(?string $email)
    {
        $this->email = $email;
        return $this;
    }

    public function getEmail()
    {
        return $this->email;
    }

    public function setPhone(?string $phone)
    {
        $this->phone = $phone;
        return $this;
    }

    public function getPhone()
    {
        return $this->phone;
    }

    public function setBirthday(?\DateTimeInterface $birthday)
    {
        $this->birthday = $birthday;
        return $this;
    }

    public function getBirthday()
    {
        return $this->birthday;
    }

    public function setAddress(?string $address)
    {
        $this->address = $address;
        return $this;
    }

    public function getAddress()
    {
        return $this->address;
    }

    public function setLat(?float $lat)
    {
        $this->lat = $lat;
        return $this;
    }

    public function getLat()
    {
        return $this->lat;
    }

    public function setLng(?float $lng)
    {
        $this->lng = $lng;
        return $this;
    }

    public function getLng()
    {
        return $this->lng;
    }

    public function getCnic(): ?string
    {
        return $this->cnic;
    }

    public function setCnic(?string $cnic)
    {
        $this->cnic = $cnic;
        return $this;
    }

    /**
     * @return string|null
     */
    public function getOpeningBalance(): ?string
    {
        return $this->openingBalance;
    }

    /**
     * @param string|null $openingBalance
     */
    public function setOpeningBalance(?string $openingBalance): void
    {
        $this->openingBalance = $openingBalance;
    }

    public function getAllowCreditSale(): ?bool
    {
        return $this->allowCreditSale;
    }

    public function setAllowCreditSale(?bool $allowCreditSale): void
    {
        $this->allowCreditSale = $allowCreditSale;
    }

    public function getCreditLimit(): ?string
    {
        return $this->creditLimit;
    }

    public function setCreditLimit(?string $creditLimit): void
    {
        $this->creditLimit = $creditLimit;
    }

    public static function createFromRequest(Request $request) : self
    {
        $dto = new self();
        $data = json_decode($request->getContent(), true);

        $dto->id = $data['id'] ?? null;
        $dto->name = $data['name'] ?? null;
        $dto->email = $data['email'] ?? null;
        $dto->phone = $data['phone'] ?? null;
        $dto->birthday = $data['birthday'] ?? null;
        $dto->address = $data['address'] ?? null;
        $dto->lat = $data['lat'] ?? null;
        $dto->lng = $data['lng'] ?? null;
        $dto->cnic = $data['cnic'] ?? null;
        $dto->openingBalance = $data['openingBalance'] ?? null;
        $dto->allowCreditSale = isset($data['allowCreditSale']) ? (bool)$data['allowCreditSale'] : null;
        $creditLimit = $data['creditLimit'] ?? null;
        $dto->creditLimit = ($creditLimit !== null && $creditLimit !== '') ? (string)$creditLimit : null;

        return $dto;
    }

    public function populateCommand(UpdateCustomerCommand $command)
    {
        $command->setId($this->id);
        $command->setName($this->name);
        $command->setEmail($this->email);
        $command->setPhone($this->phone);
        $command->setBirthday($this->birthday);
        $command->setAddress($this->address);
        $command->setLat($this->lat);
        $command->setLng($this->lng);
        $command->setCnic($this->cnic);
        $command->setOpeningBalance($this->openingBalance);
        $command->setAllowCreditSale($this->allowCreditSale);
        $command->setCreditLimit($this->creditLimit);
    }
}
