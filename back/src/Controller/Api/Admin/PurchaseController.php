<?php

namespace App\Controller\Api\Admin;

use App\Factory\Controller\ApiResponseFactory;
use App\Repository\PurchaseOrderRepository;
use App\Repository\PurchaseRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/purchases", name="admin_purchases_")
 */
class PurchaseController extends AbstractController
{
    /**
     * @Route("/next-number", methods={"GET"}, name="next_number")
     */
    public function nextPurchaseNumber(
        PurchaseRepository $repo,
        ApiResponseFactory $responseFactory
    ): Response {
        return $responseFactory->json([
            'nextNumber' => $repo->getNextPurchaseNumber(),
        ]);
    }

    /**
     * @Route("/next-po-number", methods={"GET"}, name="next_po_number")
     */
    public function nextPoNumber(
        PurchaseOrderRepository $repo,
        ApiResponseFactory $responseFactory
    ): Response {
        return $responseFactory->json([
            'nextNumber' => $repo->getNextPoNumber(),
        ]);
    }
}
