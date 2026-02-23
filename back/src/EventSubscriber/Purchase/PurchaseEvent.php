<?php

namespace App\EventSubscriber\Purchase;

use App\Entity\Purchase;
use Doctrine\ORM\EntityManagerInterface;

class PurchaseEvent
{
    public EntityManagerInterface $entityManager;

    /**
     * @throws \Exception
     */
    public function onPurchase(Purchase $purchase)
    {
        if(!$this->entityManager instanceof EntityManagerInterface){
            throw new \Exception('Please pass an entity manager instance');
        }

        if($purchase->getPurchaseOrder() !== null){
            $purchase->getPurchaseOrder()->setIsUsed(true);
        }

        foreach($purchase->getItems() as $item){
            if($purchase->getUpdatePrice()){
                // PMP (Prix Moyen Pondéré) calculation
                $product = $item->getItem();
                $currentCost = (float) ($product->getCost() ?? 0);
                $incomingQty = (float) $item->getQuantity();
                $incomingPrice = (float) $item->getPurchasePrice();

                // Get current stock for this store
                $currentStock = 0;
                foreach($product->getStores() as $s){
                    if($s->getStore()->getId() === $purchase->getStore()->getId()){
                        $currentStock = (float) $s->getQuantity();
                        break;
                    }
                }

                // Calculate PMP: weighted average cost
                if($currentStock <= 0 || $currentCost <= 0){
                    // No existing stock or no cost set: PMP = purchase price
                    $newCost = $incomingPrice;
                } else {
                    // PMP = (currentStock * currentCost + incomingQty * incomingPrice) / (currentStock + incomingQty)
                    $totalValue = ($currentStock * $currentCost) + ($incomingQty * $incomingPrice);
                    $totalQty = $currentStock + $incomingQty;
                    $newCost = $totalQty > 0 ? round($totalValue / $totalQty, 2) : $currentCost;
                }

                $product->setCost((string) $newCost);

                foreach($item->getVariants() as $purchaseItemVariant){
                    $productVariant = $purchaseItemVariant->getVariant();
                    $variantIncomingQty = (float) $purchaseItemVariant->getQuantity();
                    $variantIncomingPrice = (float) $purchaseItemVariant->getPurchasePrice();

                    // PMP calculation per variant
                    $variantCurrentCost = (float) ($productVariant->getCost() ?? 0);
                    $variantCurrentQty = (float) ($productVariant->getQuantity() ?? 0);

                    if($variantCurrentQty <= 0 || $variantCurrentCost <= 0){
                        $newVariantCost = $variantIncomingPrice;
                    } else {
                        $variantTotalValue = ($variantCurrentQty * $variantCurrentCost) + ($variantIncomingQty * $variantIncomingPrice);
                        $variantTotalQty = $variantCurrentQty + $variantIncomingQty;
                        $newVariantCost = $variantTotalQty > 0 ? round($variantTotalValue / $variantTotalQty, 2) : $variantCurrentCost;
                    }

                    $productVariant->setCost((string) $newVariantCost);
                }
            }
            if($purchase->getUpdateStocks()){
                // get store and update in it
                $store = null;
                foreach($item->getItem()->getStores() as $s){
                    if($s->getStore()->getId() === $purchase->getStore()->getId()){
                        $store = $s;
                        break;
                    }
                }
                if($store !== null){
                    $store->setQuantity($store->getQuantity() + $item->getQuantity());
                }

                $this->entityManager->persist($store);

                foreach($item->getVariants() as $variant){
                    $variant->getVariant()->setQuantity($variant->getVariant()->getQuantity() + $variant->getQuantity());
                }
            }
        }

        $this->entityManager->persist($purchase);
        $this->entityManager->flush();
    }
}
