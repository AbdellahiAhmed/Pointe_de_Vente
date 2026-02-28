<?php

namespace App\Controller\Api\Admin;

use App\Entity\Product;
use App\Entity\ProductStore;
use App\Entity\StockMovement;
use App\Entity\Store;
use App\Factory\Controller\ApiResponseFactory;
use App\Repository\ProductStoreRepository;
use App\Security\Voter\ProductVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/stock", name="admin_stock_")
 */
class StockController extends AbstractController
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * @Route("/alerts", methods={"GET"}, name="alerts")
     */
    public function alerts(
        Request $request,
        ProductStoreRepository $repo,
        ApiResponseFactory $responseFactory
    ): Response {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);

        $storeId = $request->query->getInt('store') ?: null;
        $items = $repo->findBelowReorderLevel($storeId);

        $data = array_map(static fn(ProductStore $ps) => [
            'productId'    => $ps->getProduct()->getId(),
            'productName'  => $ps->getProduct()->getName(),
            'barcode'      => $ps->getProduct()->getBarcode(),
            'storeId'      => $ps->getStore()->getId(),
            'storeName'    => $ps->getStore()->getName(),
            'quantity'     => (float) $ps->getQuantity(),
            'reOrderLevel' => (float) ($ps->getReOrderLevel() ?? 10),
        ], $items);

        return $responseFactory->json([
            'list'  => $data,
            'count' => count($data),
        ]);
    }

    /**
     * @Route("/adjustment", methods={"POST"}, name="adjustment")
     */
    public function adjustment(
        Request $request,
        ApiResponseFactory $responseFactory
    ): Response {
        $this->denyAccessUnlessGranted(ProductVoter::MANAGE);

        $data = json_decode($request->getContent(), true);
        $productId = $data['productId'] ?? null;
        $storeId = $data['storeId'] ?? null;
        $newQuantity = $data['newQuantity'] ?? null;
        $reason = trim($data['reason'] ?? '');

        if (!$productId || !$storeId || $newQuantity === null) {
            return $responseFactory->validationError('productId, storeId, and newQuantity are required.');
        }

        $newQuantity = (float) $newQuantity;
        if ($newQuantity < 0) {
            return $responseFactory->validationError('Quantity cannot be negative.');
        }

        $product = $this->em->getRepository(Product::class)->find($productId);
        if (!$product) {
            return $responseFactory->notFound(['message' => 'Product not found.']);
        }

        $store = $this->em->getRepository(Store::class)->find($storeId);
        if (!$store) {
            return $responseFactory->notFound(['message' => 'Store not found.']);
        }

        $productStore = $this->em->getRepository(ProductStore::class)->findOneBy([
            'product' => $product,
            'store' => $store,
        ]);

        if (!$productStore) {
            $productStore = new ProductStore();
            $productStore->setProduct($product);
            $productStore->setStore($store);
            $productStore->setQuantity('0');
            $product->addStore($productStore);
        }

        $qtyBefore = (float) $productStore->getQuantity();
        $qtyChanged = $newQuantity - $qtyBefore;
        $productStore->setQuantity((string) $newQuantity);

        $movement = new StockMovement();
        $movement->setProduct($product);
        $movement->setProductStore($productStore);
        $movement->setStore($store);
        $movement->setQuantityBefore((string) $qtyBefore);
        $movement->setQuantityAfter((string) $newQuantity);
        $movement->setQuantityChanged((string) $qtyChanged);
        $movement->setType(StockMovement::TYPE_ADJUSTMENT);
        $movement->setReason($reason ?: null);
        $movement->setUser($this->getUser());

        $this->em->persist($productStore);
        $this->em->persist($movement);
        $this->em->flush();

        return $responseFactory->json([
            'success' => true,
            'productId' => $product->getId(),
            'productName' => $product->getName(),
            'storeId' => $store->getId(),
            'quantityBefore' => $qtyBefore,
            'quantityAfter' => $newQuantity,
            'quantityChanged' => $qtyChanged,
        ]);
    }

    /**
     * @Route("/movements", methods={"GET"}, name="movements")
     */
    public function movements(
        Request $request,
        ApiResponseFactory $responseFactory
    ): Response {
        $this->denyAccessUnlessGranted(ProductVoter::MANAGE);

        $productId = $request->query->get('product');
        $storeId = $request->query->get('store');
        $type = $request->query->get('type');
        $dateFrom = $request->query->get('dateFrom');
        $dateTo = $request->query->get('dateTo');
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(100, max(10, $request->query->getInt('limit', 50)));

        $qb = $this->em->createQueryBuilder()
            ->select('m', 'p', 's', 'u')
            ->from(StockMovement::class, 'm')
            ->leftJoin('m.product', 'p')
            ->leftJoin('m.store', 's')
            ->leftJoin('m.user', 'u')
            ->orderBy('m.createdAt', 'DESC');

        if ($productId) {
            $qb->andWhere('m.product = :product')->setParameter('product', $productId);
        }
        if ($storeId) {
            $qb->andWhere('m.store = :store')->setParameter('store', $storeId);
        }
        if ($type) {
            $qb->andWhere('m.type = :type')->setParameter('type', $type);
        }
        if ($dateFrom) {
            $qb->andWhere('m.createdAt >= :dateFrom')->setParameter('dateFrom', $dateFrom . ' 00:00:00');
        }
        if ($dateTo) {
            $qb->andWhere('m.createdAt <= :dateTo')->setParameter('dateTo', $dateTo . ' 23:59:59');
        }

        // Count total
        $countQb = clone $qb;
        $countQb->select('COUNT(m.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        // Paginate
        $qb->setFirstResult(($page - 1) * $limit)
           ->setMaxResults($limit);

        $movements = $qb->getQuery()->getResult();

        $data = array_map(static function (StockMovement $m) {
            return [
                'id' => $m->getId(),
                'productId' => $m->getProduct() ? $m->getProduct()->getId() : null,
                'productName' => $m->getProduct() ? $m->getProduct()->getName() : null,
                'storeId' => $m->getStore() ? $m->getStore()->getId() : null,
                'storeName' => $m->getStore() ? $m->getStore()->getName() : null,
                'quantityBefore' => (float) $m->getQuantityBefore(),
                'quantityAfter' => (float) $m->getQuantityAfter(),
                'quantityChanged' => (float) $m->getQuantityChanged(),
                'type' => $m->getType(),
                'reference' => $m->getReference(),
                'reason' => $m->getReason(),
                'userName' => $m->getUser() ? $m->getUser()->getDisplayName() : null,
                'createdAt' => $m->getCreatedAt() ? $m->getCreatedAt()->format('Y-m-d H:i:s') : null,
            ];
        }, $movements);

        return $responseFactory->json([
            'list' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => (int) ceil($total / $limit),
        ]);
    }
}
