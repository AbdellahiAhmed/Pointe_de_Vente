<?php

namespace App\Controller\Api;

use App\Entity\Media;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

class PublicMediaController extends AbstractController
{
    /**
     * @Route("/api/media/{id}/content", methods={"GET"}, name="public_media_content")
     */
    public function content(
        int $id,
        EntityManagerInterface $em
    ): Response
    {
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
        $response->headers->set('Cache-Control', 'public, max-age=86400');
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $media->getOriginalName()
        );

        return $response;
    }
}
