<?php


namespace App\Controller\Api\Admin;


use App\Core\Dto\Controller\Api\Admin\Product\CreateProductRequestDto;
use App\Core\Dto\Controller\Api\Admin\Product\ProductListKeywordsResponseDto;
use App\Core\Dto\Controller\Api\Admin\Product\ProductListRequestDto;
use App\Core\Dto\Controller\Api\Admin\Product\ProductListResponseDto;
use App\Core\Dto\Controller\Api\Admin\Product\ProductResponseDto;
use App\Core\Dto\Controller\Api\Admin\Product\UpdateProductRequestDto;
use App\Core\Dto\Controller\Api\Admin\Product\UploadProductRequestDto;
use App\Core\Product\Command\CreateProductCommand\CreateProductCommand;
use App\Core\Product\Command\CreateProductCommand\CreateProductCommandHandlerInterface;
use App\Core\Product\Command\DeleteProductCommand\DeleteProductCommand;
use App\Core\Product\Command\DeleteProductCommand\DeleteProductCommandHandlerInterface;
use App\Core\Product\Command\UpdateProductCommand\UpdateProductCommand;
use App\Core\Product\Command\UpdateProductCommand\UpdateProductCommandHandlerInterface;
use App\Core\Product\Query\GetProductsKeywords\GetProductsKeywordsQuery;
use App\Core\Product\Query\GetProductsKeywords\GetProductsKeywordsQueryHandlerInterface;
use App\Core\Product\Query\GetProductsListQuery\GetProductsListQuery;
use App\Core\Product\Query\GetProductsListQuery\GetProductsListQueryHandlerInterface;
use App\Core\Validation\ApiRequestDtoValidator;
use App\Entity\Category;
use App\Entity\Product;
use App\Factory\Controller\ApiResponseFactory;
use App\Security\Voter\ProductVoter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\Serializer;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * Class ProductController
 * @package App\Controller\Api\Admin
 * @Route("/admin/product", name="admin_products_")
 */
class ProductController extends AbstractController
{
    /**
     * @Route("/keywords", methods={"GET"}, name="keywords")
     */
    public function keywords(
        Request $request,
        ApiResponseFactory $responseFactory,
        GetProductsKeywordsQueryHandlerInterface $productsListQueryHandler,
        SerializerInterface $serializer
    )
    {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);
        $requestDto = ProductListRequestDto::createFromRequest($request);

        $query = new GetProductsKeywordsQuery();

        $requestDto->populateQuery($query);

        $list = $productsListQueryHandler->handle($query);

        $result = $serializer->serialize($list->getList(), 'jsonld', [
            'groups' => ['keyword', 'uuid.read', 'time.read']
        ]);

        return $this->json([
            'list' => json_decode($result)
        ]);
    }

    /**
     * @Route("/quantities", methods={"GET"}, name="quantities")
     */
    public function getQuantity(
        Request $request,
        ApiResponseFactory $responseFactory,
        GetProductsKeywordsQueryHandlerInterface $productsListQueryHandler,
        SerializerInterface $serializer
    ){
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);
        $requestDto = ProductListRequestDto::createFromRequest($request);

        $query = new GetProductsKeywordsQuery();

        $requestDto->populateQuery($query);

        $list = $productsListQueryHandler->handle($query);

        $quantity = null;
        foreach($list->getList() as $item){
            if($requestDto->getVariantId() !== null){
                foreach($item->getVariants() as $variant){
                    if((int) $requestDto->getVariantId() === $variant->getId()){
                        $quantity = $variant->getQuantity();
                        break 2;
                    }
                }
            }
            foreach($item->getStores() as $store){
                if($store->getStore()->getId() === (int) $requestDto->getStore()){
                    $quantity = $store->getQuantity();
                    break 2;
                }
            }
        }

        return $this->json([
            'quantity' => $quantity
        ]);
    }

    /**
     * @Route("/export", name="download_products", methods={"GET"})
     */
    public function download(
        ApiResponseFactory $responseFactory,
        GetProductsListQueryHandlerInterface $productsListQueryHandler
    )
    {
        $this->denyAccessUnlessGranted(ProductVoter::MANAGE);
        $query = new GetProductsListQuery();
        $list = $productsListQueryHandler->handle($query);

        $fileName = $this->getParameter('kernel.project_dir').'/public/downloads/products.csv';
        $handle = fopen($fileName, 'w+');
        @chmod($fileName, 0777);

        // Bug 6 fixed: added Min price and Category columns
        $columns = [
            'ID', 'Name', 'Barcode', 'Is Available?',
            'Purchase price', 'Sale price', 'Min price',
            'Available Quantity', 'Category', 'Purchase Unit', 'Sale Unit'
        ];
        fputcsv($handle, $columns);

        /** @var Product $item */
        foreach($list->getList() as $item){
            $categoryName = $item->getCategories()->count() > 0
                ? $item->getCategories()->first()->getName()
                : '';

            fputcsv($handle, [
                $item->getId(),
                $item->getName(),
                $item->getBarcode(),
                $item->getIsAvailable(),
                $item->getCost(),       // col4 = purchase price
                $item->getBasePrice(),  // col5 = sale price
                $item->getMinPrice(),   // col6 = min price
                $item->getQuantity(),
                $categoryName,
                $item->getPurchaseUnit(),
                $item->getSaleUnit(),
            ]);
        }

        fclose($handle);

        return $responseFactory->download($fileName);
    }

    /**
     * @Route("/import", name="import_products", methods={"POST"})
     */
    public function upload(
        Request $request,
        ApiRequestDtoValidator $validator,
        ApiResponseFactory $responseFactory,
        CreateProductCommandHandlerInterface $createProductCommandHandler,
        UpdateProductCommandHandlerInterface $updateProductCommandHandler
    )
    {
        $this->denyAccessUnlessGranted(ProductVoter::MANAGE);
        $requestDto = UploadProductRequestDto::createFromRequest($request);

        if(null !== $data = $validator->validate($requestDto)){
            return $responseFactory->validationError($data);
        }

        $file = $requestDto->getFile();
        $file->move($this->getParameter('kernel.project_dir').'/public/uploads', 'products.csv');

        $csvPath = $this->getParameter('kernel.project_dir').'/public/uploads/products.csv';

        // Convert file to UTF-8 if needed (Excel often saves as ISO-8859-1/Windows-1252)
        $rawContent = file_get_contents($csvPath);
        $encoding = mb_detect_encoding($rawContent, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        if ($encoding && $encoding !== 'UTF-8') {
            $rawContent = mb_convert_encoding($rawContent, 'UTF-8', $encoding);
            file_put_contents($csvPath, $rawContent);
        }

        $handle = fopen($csvPath, 'r');

        // Auto-detect delimiter (comma vs semicolon) from the first line
        $firstLine = fgets($handle);
        rewind($handle);
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        // Bug 2 fixed: header-aware column map with case-insensitive aliases
        $aliasMap = [
            'id'             => ['id', 'reference'],
            'name'           => ['name'],
            'barcode'        => ['barcode'],
            'isAvailable'    => ['isavailable', 'is available', 'is available?'],
            'cost'           => ['cost', 'purchaseprice', 'purchase price', 'pmp'],
            'basePrice'      => ['baseprice', 'saleprice', 'sale price', 'price'],
            'minPrice'       => ['minprice', 'min price', 'min sale price'],
            'quantity'       => ['quantity', 'stock', 'available quantity', 'availablequantity'],
            'category'       => ['category'],
            'purchaseUnit'   => ['purchaseunit', 'purchase unit'],
            'saleUnit'       => ['saleunit', 'sale unit'],
        ];

        $colIndex = [];     // field => integer column position
        $headerParsed = false;
        $idx = 1;           // human-readable row number (1 = first data row)
        $imported = 0;
        $errorsArray = [];
        $importedProducts = [];

        $em = $this->getDoctrine()->getManager();

        while(($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            // Bug 2 fixed: parse header row to build column position map
            if(!$headerParsed){
                foreach($row as $pos => $header){
                    // Strip BOM from the first cell if present
                    $normalized = strtolower(trim(preg_replace('/^\x{FEFF}/u', '', $header)));
                    foreach($aliasMap as $field => $aliases){
                        if(in_array($normalized, $aliases, true)){
                            $colIndex[$field] = $pos;
                            break;
                        }
                    }
                }
                $headerParsed = true;
                continue;
            }

            // Helper closure to safely read a cell by logical field name
            $get = function(string $field, string $default = '') use ($row, $colIndex): string {
                if(!isset($colIndex[$field])){
                    return $default;
                }
                return isset($row[$colIndex[$field]]) ? trim($row[$colIndex[$field]]) : $default;
            };

            try {
                $idValue      = $get('id');
                $name         = $get('name');
                $barcode      = $get('barcode');
                $isAvailable  = $get('isAvailable', '1');
                $cost         = $get('cost');
                $basePrice    = $get('basePrice');
                $minPrice     = $get('minPrice');
                $quantity     = $get('quantity');
                $categoryName = $get('category');
                $purchaseUnit = $get('purchaseUnit', 'unit');
                $saleUnit     = $get('saleUnit', 'unit');

                $isCreate = ((int)$idValue === 0 || $idValue === '');

                if($isCreate){
                    $command = new CreateProductCommand();
                    $command->setName($name);
                    $command->setBarcode($barcode ?: null);
                    $command->setIsAvailable((bool)$isAvailable);
                    $command->setCost($cost !== '' ? $cost : null);
                    $command->setBasePrice($basePrice !== '' ? $basePrice : null);
                    $command->setQuantity($quantity !== '' ? $quantity : null);
                    $command->setPurchaseUnit($purchaseUnit ?: 'unit');
                    $command->setSaleUnit($saleUnit ?: 'unit');

                    $result = $createProductCommandHandler->handle($command);
                }else{
                    $command = new UpdateProductCommand();
                    $command->setId((int)$idValue);
                    $command->setName($name);
                    $command->setBarcode($barcode ?: null);
                    $command->setIsAvailable((bool)$isAvailable);
                    $command->setCost($cost !== '' ? $cost : null);
                    $command->setBasePrice($basePrice !== '' ? $basePrice : null);
                    $command->setQuantity($quantity !== '' ? $quantity : null);
                    $command->setPurchaseUnit($purchaseUnit ?: 'unit');
                    $command->setSaleUnit($saleUnit ?: 'unit');

                    $result = $updateProductCommandHandler->handle($command);
                }

                if($result->hasValidationError()){
                    $validationError = $result->getValidationError();
                    if(is_string($validationError)){
                        $message = $validationError;
                    }else{
                        $messages = [];
                        foreach($validationError->getViolations() as $violation){
                            $messages[] = $violation->getMessage();
                        }
                        $message = implode(', ', $messages);
                    }
                    $errorsArray[] = ['row' => $idx, 'message' => $message];
                    $idx++;
                    continue;
                }

                if($result->isNotFound()){
                    $errorsArray[] = ['row' => $idx, 'message' => $result->getNotFoundMessage() ?? 'Product not found'];
                    $idx++;
                    continue;
                }

                $product = $result->getProduct();

                if($minPrice !== ''){
                    $product->setMinPrice($minPrice);
                }

                if($quantity !== '' && (float)$quantity > 0){
                    $product->setManageInventory(true);
                }

                $product->setIsActive(true);

                if($categoryName !== ''){
                    $category = $em->getRepository(Category::class)->findOneBy(['name' => $categoryName]);
                    if($category !== null){
                        $product->addCategory($category);
                    }
                }

                $em->flush();

                $importedProducts[] = [
                    'id' => $product->getId(),
                    'name' => $product->getName(),
                ];
                $imported++;
            } catch (\Exception $e) {
                $errorsArray[] = ['row' => $idx, 'message' => $e->getMessage()];
            }

            $idx++;
        }

        fclose($handle);

        // Bug 5 fixed: always return 200 with the structured response the frontend expects
        return $responseFactory->json([
            'imported' => $imported,
            'errors' => $errorsArray,
            'products' => $importedProducts,
        ]);
    }
}
