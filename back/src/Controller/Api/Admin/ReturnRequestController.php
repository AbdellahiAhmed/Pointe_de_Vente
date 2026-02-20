<?php

namespace App\Controller\Api\Admin;

use App\Entity\Order;
use App\Entity\OrderProduct;
use App\Entity\ProductStore;
use App\Entity\ReturnRequest;
use App\Entity\ReturnRequestItem;
use App\Factory\Controller\ApiResponseFactory;
use App\Repository\OrderProductRepository;
use App\Repository\OrderRepository;
use App\Repository\ProductStoreRepository;
use App\Repository\ReturnRequestRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/return-requests", name="admin_return_requests_")
 */
class ReturnRequestController extends AbstractController
{
    /**
     * Create a new return request.
     * Accessible by ROLE_VENDEUR and above.
     *
     * @Route("", methods={"POST"}, name="create")
     */
    public function create(
        Request $request,
        ApiResponseFactory $responseFactory,
        OrderRepository $orderRepository,
        OrderProductRepository $orderProductRepository
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_VENDEUR');

        $data = json_decode($request->getContent(), true);

        if (empty($data['orderId'])) {
            return $responseFactory->validationError('orderId is required.');
        }

        if (empty($data['items']) || !is_array($data['items'])) {
            return $responseFactory->validationError('items array is required and must not be empty.');
        }

        $order = $orderRepository->find($data['orderId']);
        if (!$order) {
            return $responseFactory->notFound('Order not found.');
        }

        $em = $this->getDoctrine()->getManager();

        $returnRequest = new ReturnRequest();
        $returnRequest->setOrder($order);
        $returnRequest->setRequestedBy($this->getUser());
        $returnRequest->setStore($order->getStore());
        $returnRequest->setStatus('PENDING');

        if (!empty($data['reason'])) {
            $returnRequest->setReason($data['reason']);
        }

        foreach ($data['items'] as $itemData) {
            if (empty($itemData['orderProductId']) || empty($itemData['quantity'])) {
                return $responseFactory->validationError('Each item requires orderProductId and quantity.');
            }

            $orderProduct = $orderProductRepository->find($itemData['orderProductId']);
            if (!$orderProduct) {
                return $responseFactory->notFound(sprintf('OrderProduct %d not found.', $itemData['orderProductId']));
            }

            if ($orderProduct->getOrder()->getId() !== $order->getId()) {
                return $responseFactory->validationError(
                    sprintf('OrderProduct %d does not belong to the given order.', $itemData['orderProductId'])
                );
            }

            $item = new ReturnRequestItem();
            $item->setOrderProduct($orderProduct);
            $item->setQuantity((int) $itemData['quantity']);

            if (!empty($itemData['reason'])) {
                $item->setReason($itemData['reason']);
            }

            $returnRequest->addItem($item);
        }

        $em->persist($returnRequest);
        $em->flush();

        return $responseFactory->json([
            'id'     => $returnRequest->getId(),
            'uuid'   => $returnRequest->getUuid(),
            'status' => $returnRequest->getStatus(),
        ], Response::HTTP_CREATED);
    }

    /**
     * List all return requests.
     * Accessible by ROLE_MANAGER and above.
     *
     * @Route("", methods={"GET"}, name="list")
     */
    public function list(
        Request $request,
        ApiResponseFactory $responseFactory,
        ReturnRequestRepository $repository
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_MANAGER');

        $status = $request->query->get('status');

        $criteria = [];
        if ($status) {
            $criteria['status'] = $status;
        }

        $returnRequests = $repository->findBy($criteria, ['createdAt' => 'DESC']);

        $data = array_map(static function (ReturnRequest $rr) {
            return [
                'id'          => $rr->getId(),
                'uuid'        => $rr->getUuid(),
                'status'      => $rr->getStatus(),
                'reason'      => $rr->getReason(),
                'createdAt'   => $rr->getCreatedAt() ? $rr->getCreatedAt()->format(\DateTime::ATOM) : null,
                'orderId'     => $rr->getOrder() ? $rr->getOrder()->getId() : null,
                'orderRefId'  => $rr->getOrder() ? $rr->getOrder()->getOrderId() : null,
                'requestedBy' => $rr->getRequestedBy() ? [
                    'id'          => $rr->getRequestedBy()->getId(),
                    'displayName' => $rr->getRequestedBy()->getDisplayName(),
                ] : null,
                'approvedBy'  => $rr->getApprovedBy() ? [
                    'id'          => $rr->getApprovedBy()->getId(),
                    'displayName' => $rr->getApprovedBy()->getDisplayName(),
                ] : null,
                'store'       => $rr->getStore() ? [
                    'id'   => $rr->getStore()->getId(),
                    'name' => $rr->getStore()->getName(),
                ] : null,
                'itemCount'   => $rr->getItems()->count(),
            ];
        }, $returnRequests);

        return $responseFactory->json([
            'list'  => $data,
            'count' => count($data),
        ]);
    }

    /**
     * Get a single return request.
     * ROLE_VENDEUR may only see their own requests; ROLE_MANAGER may see all.
     *
     * @Route("/{id}", methods={"GET"}, name="show", requirements={"id"="\d+"})
     */
    public function show(
        int $id,
        ApiResponseFactory $responseFactory,
        ReturnRequestRepository $repository
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_VENDEUR');

        $returnRequest = $repository->find($id);
        if (!$returnRequest) {
            return $responseFactory->notFound('Return request not found.');
        }

        /** @var \App\Entity\User $currentUser */
        $currentUser = $this->getUser();

        // VENDEUR can only see their own requests
        if (
            !$this->isGranted('ROLE_MANAGER') &&
            $returnRequest->getRequestedBy()->getId() !== $currentUser->getId()
        ) {
            return $responseFactory->unauthorized('Access denied.');
        }

        $itemsData = [];
        foreach ($returnRequest->getItems() as $item) {
            $op = $item->getOrderProduct();
            $itemsData[] = [
                'id'             => $item->getId(),
                'quantity'       => $item->getQuantity(),
                'reason'         => $item->getReason(),
                'orderProductId' => $op ? $op->getId() : null,
                'productId'      => ($op && $op->getProduct()) ? $op->getProduct()->getId() : null,
                'productName'    => ($op && $op->getProduct()) ? $op->getProduct()->getName() : null,
                'price'          => $op ? $op->getPrice() : null,
            ];
        }

        return $responseFactory->json([
            'id'          => $returnRequest->getId(),
            'uuid'        => $returnRequest->getUuid(),
            'status'      => $returnRequest->getStatus(),
            'reason'      => $returnRequest->getReason(),
            'createdAt'   => $returnRequest->getCreatedAt() ? $returnRequest->getCreatedAt()->format(\DateTime::ATOM) : null,
            'orderId'     => $returnRequest->getOrder() ? $returnRequest->getOrder()->getId() : null,
            'orderRefId'  => $returnRequest->getOrder() ? $returnRequest->getOrder()->getOrderId() : null,
            'requestedBy' => $returnRequest->getRequestedBy() ? [
                'id'          => $returnRequest->getRequestedBy()->getId(),
                'displayName' => $returnRequest->getRequestedBy()->getDisplayName(),
            ] : null,
            'approvedBy'  => $returnRequest->getApprovedBy() ? [
                'id'          => $returnRequest->getApprovedBy()->getId(),
                'displayName' => $returnRequest->getApprovedBy()->getDisplayName(),
            ] : null,
            'store'       => $returnRequest->getStore() ? [
                'id'   => $returnRequest->getStore()->getId(),
                'name' => $returnRequest->getStore()->getName(),
            ] : null,
            'items'       => $itemsData,
        ]);
    }

    /**
     * Approve a return request.
     * Creates a return Order, restores stock, marks items as returned.
     * Accessible by ROLE_MANAGER and above.
     *
     * @Route("/{id}/approve", methods={"PUT"}, name="approve", requirements={"id"="\d+"})
     */
    public function approve(
        int $id,
        ApiResponseFactory $responseFactory,
        ReturnRequestRepository $repository,
        ProductStoreRepository $productStoreRepository
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_MANAGER');

        $returnRequest = $repository->find($id);
        if (!$returnRequest) {
            return $responseFactory->notFound('Return request not found.');
        }

        if ($returnRequest->getStatus() !== 'PENDING') {
            return $responseFactory->validationError(
                sprintf('Return request is already %s and cannot be approved.', $returnRequest->getStatus())
            );
        }

        $em = $this->getDoctrine()->getManager();
        $originalOrder = $returnRequest->getOrder();

        // 1. Create the return Order with negative quantities
        $returnOrder = new Order();
        $returnOrder->setStatus('RETURNED');
        $returnOrder->setReturnedFrom($originalOrder);
        $returnOrder->setIsReturned(true);
        $returnOrder->setUser($this->getUser());
        $returnOrder->setStore($originalOrder->getStore());
        $returnOrder->setTerminal($originalOrder->getTerminal());
        $returnOrder->setDescription(sprintf('Return for order #%d', $originalOrder->getOrderId()));

        // 2. Process each ReturnRequestItem
        foreach ($returnRequest->getItems() as $requestItem) {
            $originalOrderProduct = $requestItem->getOrderProduct();
            $product              = $originalOrderProduct->getProduct();
            $returnQty            = $requestItem->getQuantity();

            // Create a return OrderProduct with negative quantity
            $returnOrderProduct = new OrderProduct();
            $returnOrderProduct->setProduct($product);
            $returnOrderProduct->setVariant($originalOrderProduct->getVariant());
            $returnOrderProduct->setQuantity((string) (-1 * abs($returnQty)));
            $returnOrderProduct->setPrice($originalOrderProduct->getPrice());
            $returnOrderProduct->setDiscount($originalOrderProduct->getDiscount());
            $returnOrderProduct->setCostAtSale($originalOrderProduct->getCostAtSale());
            $returnOrderProduct->setIsReturned(true);

            foreach ($originalOrderProduct->getTaxes() as $tax) {
                $returnOrderProduct->addTax($tax);
            }

            $returnOrder->addItem($returnOrderProduct);
            $em->persist($returnOrderProduct);

            // 3. Restore stock in ProductStore
            $store = $originalOrder->getStore();
            if ($store && $product) {
                $productStore = $productStoreRepository->findOneBy([
                    'product' => $product,
                    'store'   => $store,
                ]);

                if ($productStore) {
                    $currentQty = (float) $productStore->getQuantity();
                    $productStore->setQuantity((string) ($currentQty + abs($returnQty)));
                    $em->persist($productStore);
                }
            }

            // 4. Mark the original OrderProduct as returned
            $originalOrderProduct->setIsReturned(true);
            $em->persist($originalOrderProduct);
        }

        $em->persist($returnOrder);

        // 5. Update ReturnRequest status
        $returnRequest->setStatus('APPROVED');
        $returnRequest->setApprovedBy($this->getUser());
        $em->persist($returnRequest);

        $em->flush();

        return $responseFactory->json([
            'id'            => $returnRequest->getId(),
            'status'        => $returnRequest->getStatus(),
            'returnOrderId' => $returnOrder->getId(),
        ]);
    }

    /**
     * Reject a return request.
     * Accessible by ROLE_MANAGER and above.
     *
     * @Route("/{id}/reject", methods={"PUT"}, name="reject", requirements={"id"="\d+"})
     */
    public function reject(
        int $id,
        Request $request,
        ApiResponseFactory $responseFactory,
        ReturnRequestRepository $repository
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_MANAGER');

        $returnRequest = $repository->find($id);
        if (!$returnRequest) {
            return $responseFactory->notFound('Return request not found.');
        }

        if ($returnRequest->getStatus() !== 'PENDING') {
            return $responseFactory->validationError(
                sprintf('Return request is already %s and cannot be rejected.', $returnRequest->getStatus())
            );
        }

        $data = json_decode($request->getContent(), true);

        if (!empty($data['reason'])) {
            $returnRequest->setReason($data['reason']);
        }

        $returnRequest->setStatus('REJECTED');

        $em = $this->getDoctrine()->getManager();
        $em->persist($returnRequest);
        $em->flush();

        return $responseFactory->json([
            'id'     => $returnRequest->getId(),
            'status' => $returnRequest->getStatus(),
        ]);
    }
}
