<?php

namespace App\Controller\Api\Admin;

use App\Core\Dto\Controller\Api\Admin\Closing\CreateClosingRequestDto;
use App\Core\Dto\Controller\Api\Admin\Closing\SelectClosingListResponseDto;
use App\Core\Dto\Controller\Api\Admin\Closing\SelectClosingRequestDto;
use App\Core\Dto\Controller\Api\Admin\Closing\SelectClosingResponseDto;
use App\Core\Dto\Controller\Api\Admin\Closing\UpdateClosingRequestDto;
use App\Core\Closing\Command\CloseSessionCommand\CloseSessionCommand;
use App\Core\Closing\Command\CloseSessionCommand\CloseSessionCommandHandlerInterface;
use App\Core\Closing\Command\CreateClosingCommand\CreateClosingCommand;
use App\Core\Closing\Command\CreateClosingCommand\CreateClosingCommandHandlerInterface;
use App\Core\Closing\Command\DeleteClosingCommand\DeleteClosingCommand;
use App\Core\Closing\Command\DeleteClosingCommand\DeleteClosingCommandHandlerInterface;
use App\Core\Closing\Command\UpdateClosingCommand\UpdateClosingCommand;
use App\Core\Closing\Command\UpdateClosingCommand\UpdateClosingCommandHandlerInterface;
use App\Core\Closing\Query\SelectClosingQuery\SelectClosingQuery;
use App\Core\Closing\Query\SelectClosingQuery\SelectClosingQueryHandlerInterface;
use App\Core\Validation\ApiRequestDtoValidator;
use App\Entity\Closing;
use App\Factory\Controller\ApiResponseFactory;
use App\Repository\ClosingRepository;
use App\Repository\StoreRepository;
use App\Repository\TerminalRepository;
use Carbon\Carbon;
use App\Security\Voter\ClosingVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/closing", name="admin_closings_")
 */
class ClosingController extends AbstractController
{
    /**
     * @Route("/list", methods={"GET"}, name="list")
     */
    public function list(Request $request, ApiResponseFactory $responseFactory, ApiRequestDtoValidator $requestDtoValidator, SelectClosingQueryHandlerInterface $handler)
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);
        $requestDto = SelectClosingRequestDto::createFromRequest($request);

        $query = new SelectClosingQuery();

        $requestDto->populateQuery($query);

        $list = $handler->handle($query);

        $responseDto = SelectClosingListResponseDto::createFromResult($list);

        return $responseFactory->json($responseDto);
    }

    /**
     * @Route("/create", methods={"POST"}, name="create")
     */
    public function create(Request $request, ApiRequestDtoValidator $requestDtoValidator, ApiResponseFactory $responseFactory, CreateClosingCommandHandlerInterface $handler)
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);
        $requestDto = CreateClosingRequestDto::createFromRequest($request);
        if(null !== $violations = $requestDtoValidator->validate($requestDto)){
            return $responseFactory->validationError($violations);
        }

        $command = new CreateClosingCommand();
        $requestDto->populateCommand($command);

        $result = $handler->handle($command);

        if($result->hasValidationError()){
            return $responseFactory->validationError($result->getValidationError());
        }

        if($result->isNotFound()){
            return $responseFactory->notFound($result->getNotFoundMessage());
        }

        return $responseFactory->json(
            SelectClosingResponseDto::createFromClosing($result->getClosing())
        );
    }

    /**
     * @Route("/opened", methods={"GET"}, name="opened")
     */
    public function getOpened(
        ApiResponseFactory $responseFactory,
        ClosingRepository $closingRepository,
        Request $request,
        StoreRepository $storeRepository,
        EntityManagerInterface $entityManager,
        TerminalRepository $terminalRepository
    )
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);
        $store = $storeRepository->find($request->query->get('store'));
        $terminal = $terminalRepository->find($request->query->get('terminal'));

        if ($store === null || $terminal === null) {
            return $responseFactory->json(['error' => 'Store and terminal are required'], 400);
        }

        $qb = $closingRepository->createQueryBuilder('closing');
        $qb->andWhere('closing.closedAt IS NULL');
        $qb->join('closing.store', 'store');
        $qb->join('closing.terminal', 'terminal');
        $qb->andWhere('store = :store')->setParameter('store', $store);
        $qb->andWhere('terminal = :terminal')->setParameter('terminal', $terminal);
        $qb->orderBy('closing.id', 'DESC');
        $qb->setMaxResults(1);

        $closing = $qb->getQuery()->getOneOrNullResult();

        if($closing === null){
            //create new closing and return
            $closing = new Closing();
            $closing->setStore($store);
            $closing->setTerminal($terminal);
            $closing->setDateFrom(Carbon::now()->toDateTimeImmutable());
            $closing->setOpenedBy($this->getUser());

            $entityManager->persist($closing);
            $entityManager->flush();
        }

        return $responseFactory->json(SelectClosingResponseDto::createFromClosing($closing));
    }

    /**
     * @Route("/{id}/close", methods={"POST"}, name="close", requirements={"id"="\d+"})
     */
    public function closeSession(
        $id,
        Request $request,
        ApiResponseFactory $responseFactory,
        CloseSessionCommandHandlerInterface $handler,
        ClosingRepository $closingRepository
    )
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);

        $body = json_decode($request->getContent(), true) ?? [];

        $command = new CloseSessionCommand();
        $command->setId((int) $id);
        $command->setClosedBy($this->getUser()->getId());
        $command->setClosingBalance($body['closingBalance'] ?? null);
        $command->setDenominations($body['denominations'] ?? null);

        $result = $handler->handle($command);

        if ($result->isNotFound()) {
            return $responseFactory->notFound($result->getNotFoundMessage());
        }

        if ($result->hasValidationError()) {
            return $responseFactory->validationError($result->getValidationError());
        }

        return $responseFactory->json(
            SelectClosingResponseDto::createFromClosing($result->getClosing())
        );
    }

    /**
     * @Route("/{id}/z-report-data", methods={"GET"}, name="z_report_data", requirements={"id"="\d+"})
     */
    public function zReportData(
        $id,
        ApiResponseFactory $responseFactory,
        ClosingRepository $closingRepository
    )
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);

        $closing = $closingRepository->find($id);

        if ($closing === null) {
            return $responseFactory->notFound('Closing not found');
        }

        if ($closing->getZReportSnapshot() === null) {
            return $responseFactory->validationError('Z-Report not generated yet');
        }

        return $responseFactory->json($closing->getZReportSnapshot());
    }

    /**
     * @Route("/{id}", methods={"GET"}, name="get", requirements={"id"="\d+"})
     */
    public function getById(Closing $entity, ApiResponseFactory $responseFactory)
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);
        if($entity === null){
            return $responseFactory->notFound('Closing not found');
        }

        return $responseFactory->json(
            SelectClosingResponseDto::createFromClosing($entity)
        );
    }

    /**
     * @Route("/{id}", methods={"POST"}, name="update")
     */
    public function update(Request $request, ApiRequestDtoValidator $requestDtoValidator, ApiResponseFactory $responseFactory, UpdateClosingCommandHandlerInterface $handler)
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);
        $requestDto = UpdateClosingRequestDto::createFromRequest($request);
        if(null !== $violations = $requestDtoValidator->validate($requestDto)){
            return $responseFactory->validationError($violations);
        }

        $command = new UpdateClosingCommand();
        $requestDto->populateCommand($command);

        $result = $handler->handle($command);

        if($result->hasValidationError()){
            return $responseFactory->validationError($result->getValidationError());
        }

        if($result->isNotFound()){
            return $responseFactory->notFound($result->getNotFoundMessage());
        }

        return $responseFactory->json(
            SelectClosingResponseDto::createFromClosing($result->getClosing())
        );
    }

    /**
     * @Route("/{id}", methods={"DELETE"}, name="delete")
     */
    public function delete($id, ApiResponseFactory $responseFactory, DeleteClosingCommandHandlerInterface $handler)
    {
        $this->denyAccessUnlessGranted(ClosingVoter::MANAGE);
        $command = new DeleteClosingCommand();
        $command->setId($id);

        $result = $handler->handle($command);

        if($result->isNotFound()){
            return $responseFactory->notFound($result->getNotFoundMessage());
        }

        return $responseFactory->json();
    }
}
