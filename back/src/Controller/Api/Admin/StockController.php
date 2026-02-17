<?php

namespace App\Controller\Api\Admin;

use App\Entity\ProductStore;
use App\Factory\Controller\ApiResponseFactory;
use App\Repository\ProductStoreRepository;
use App\Security\Voter\ProductVoter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/stock", name="admin_stock_")
 */
class StockController extends AbstractController
{
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
}
