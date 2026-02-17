<?php

namespace App\Core\Dto\Controller\Api\Admin\Department;

use App\Core\Department\Query\SelectDepartmentQuery\SelectDepartmentQuery;
use App\Core\Dto\Common\Common\LimitTrait;
use App\Core\Dto\Common\Common\OrderTrait;
use App\Core\Dto\Common\Common\QTrait;
use Symfony\Component\HttpFoundation\Request;

class SelectDepartmentRequestDto
{
    use OrderTrait, LimitTrait, QTrait;

    const ORDERS_LIST = [
        'id' => 'Department.id',
        'name' => 'Department.name'
    ];

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
    private $description = null;

    /**
     * @var null|bool
     */
    private $isActive = null;

    /**
     * @var null|\DateTimeImmutable
     */
    private $createdAt = null;

    /**
     * @var null|string
     */
    private $uuid = null;

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

    public function setDescription(?string $description)
    {
        $this->description = $description;
        return $this;
    }

    public function getDescription()
    {
        return $this->description;
    }

    public function setIsActive(?bool $isActive)
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getIsActive()
    {
        return $this->isActive;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt)
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getCreatedAt()
    {
        return $this->createdAt;
    }

    public function setUuid(?string $uuid)
    {
        $this->uuid = $uuid;
        return $this;
    }

    public function getUuid()
    {
        return $this->uuid;
    }

    public static function createFromRequest(Request $request) : self
    {
        $dto = new self();

        $dto->id = $request->query->get('id');
        $dto->name = $request->query->get('name');
        $dto->description = $request->query->get('description');
        $dto->isActive = $request->query->get('isActive');

        $dto->limit = $request->query->get('limit');
        $dto->offset = $request->query->get('offset');
        $dto->orderBy = self::ORDERS_LIST[$request->query->get('orderBy')] ?? null;
        $dto->orderMode = $request->query->get('orderMode', 'ASC');
        $dto->q = $request->query->get('q');


        return $dto;
    }

    public function populateQuery(SelectDepartmentQuery $query)
    {
        $query->setId($this->id);
        $query->setName($this->name);
        $query->setDescription($this->description);
        $query->setIsActive($this->isActive);

        $query->setLimit($this->getLimit());
        $query->setOffset($this->getOffset());
        $query->setOrderBy($this->getOrderBy());
        $query->setOrderMode($this->getOrderMode());
        $query->setQ($this->q);
    }
}
