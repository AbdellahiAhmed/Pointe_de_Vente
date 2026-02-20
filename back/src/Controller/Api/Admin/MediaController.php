<?php

namespace App\Controller\Api\Admin;

use App\Entity\Media;
use App\Factory\Controller\ApiResponseFactory;
use App\Security\Voter\ProductVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * @Route("/admin/media", name="admin_media_")
 */
class MediaController extends AbstractController
{
    /**
     * @Route("/upload", methods={"POST"}, name="upload")
     */
    public function upload(
        Request $request,
        EntityManagerInterface $em,
        ApiResponseFactory $responseFactory
    ): Response
    {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);
        $file = $request->files->get('file');
        if (!$file) {
            return $responseFactory->json(['error' => 'No file uploaded'], 400);
        }

        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $mimeType = $file->getMimeType();

        // Validate image type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($mimeType, $allowedTypes)) {
            return $responseFactory->json(['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'], 400);
        }

        // Validate file size (max 5MB)
        if ($file->getSize() > 5 * 1024 * 1024) {
            return $responseFactory->json(['error' => 'File too large. Maximum 5MB allowed.'], 400);
        }

        // Generate unique filename
        $fileName = uniqid('product_', true) . '.' . $extension;

        // Move file to uploads directory
        $uploadDir = $this->getParameter('kernel.project_dir') . '/public/uploads/media';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $file->move($uploadDir, $fileName);

        // Create Media entity
        $media = new Media();
        $media->setOriginalName($originalName);
        $media->setName($fileName);
        $media->setExtension($extension);
        $media->setMimeType($mimeType);

        $em->persist($media);
        $em->flush();

        return $this->json([
            'id' => $media->getId(),
            '@id' => '/api/media/' . $media->getId(),
            'originalName' => $media->getOriginalName(),
            'name' => $media->getName(),
            'extension' => $media->getExtension(),
            'mimeType' => $media->getMimeType(),
            'url' => '/uploads/media/' . $fileName,
        ]);
    }

    /**
     * @Route("/{id}/content", methods={"GET"}, name="content")
     */
    public function content(
        int $id,
        EntityManagerInterface $em
    ): Response
    {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);
        $media = $em->getRepository(Media::class)->find($id);
        if (!$media) {
            return new Response('Not found', 404);
        }

        $filePath = $this->getParameter('kernel.project_dir') . '/public/uploads/media/' . $media->getName();
        if (!file_exists($filePath)) {
            return new Response('File not found', 404);
        }

        $response = new BinaryFileResponse($filePath);
        $response->headers->set('Content-Type', $media->getMimeType());
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $media->getOriginalName()
        );

        return $response;
    }
}
