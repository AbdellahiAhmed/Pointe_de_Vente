<?php

namespace App\Controller\Api;

use App\Entity\Payment;
use App\Entity\Store;
use App\Entity\Terminal;
use App\Entity\User;
use App\Factory\Controller\ApiResponseFactory;
use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\Uuid;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

class SetupController extends AbstractController
{
    /**
     * @Route("/api/setup/status", name="setup_status", methods={"GET"})
     */
    public function status(EntityManagerInterface $entityManager): JsonResponse
    {
        $userCount = $entityManager->getRepository(User::class)->count([]);

        return new JsonResponse([
            'needsSetup' => $userCount === 0,
        ]);
    }

    /**
     * @Route("/api/setup/activate", name="setup_activate", methods={"POST"})
     */
    public function activate(
        Request                     $request,
        EntityManagerInterface      $entityManager,
        UserPasswordHasherInterface $passwordHasher,
        ApiResponseFactory          $responseFactory
    ): JsonResponse
    {
        // Check if already activated
        $userCount = $entityManager->getRepository(User::class)->count([]);
        if ($userCount > 0) {
            return $responseFactory->validationError('System is already activated.', 403);
        }

        // Validate activation code
        $data = json_decode($request->getContent(), true);
        $code = $data['activationCode'] ?? '';

        if ($code !== $this->getParameter('app.activation_code')) {
            return $responseFactory->validationError('Invalid activation code.', 422);
        }

        // Validate store name and terminal code
        $storeName = trim($data['storeName'] ?? '');
        $terminalCode = trim($data['terminalCode'] ?? '');

        if ($storeName === '') {
            return $responseFactory->validationError('Store name is required.', 422);
        }
        if ($terminalCode === '') {
            return $responseFactory->validationError('Terminal code is required.', 422);
        }

        // Create store
        $store = new Store();
        $store->setName($storeName);
        $entityManager->persist($store);

        // Create terminal
        $terminal = new Terminal();
        $terminal->setCode($terminalCode);
        $terminal->setStore($store);
        $entityManager->persist($terminal);

        // Create admin user
        $user = new User();
        $user->setIsActive(true);
        $user->setUsername('admin');
        $user->setDisplayName('Admin');
        $user->setRoles(['ROLE_ADMIN']);
        $user->setSalt(Uuid::uuid4());
        $user->setPassword($passwordHasher->hashPassword($user, 'mcs123'));
        $user->setEmail('admin@pos.local');
        $user->addStore($store);
        $entityManager->persist($user);

        // Create payment types
        $types = [
            ['name' => 'Espèces', 'type' => 'cash', 'category' => 'cash', 'changeDue' => true],
            ['name' => 'Carte Bancaire', 'type' => 'credit card', 'category' => 'mobile', 'changeDue' => false],
            ['name' => 'Crédit Client', 'type' => 'credit', 'category' => 'credit', 'changeDue' => false],
            ['name' => 'Bankily', 'type' => 'bankily', 'category' => 'mobile', 'changeDue' => false],
            ['name' => 'Masrivi', 'type' => 'masrivi', 'category' => 'mobile', 'changeDue' => false],
            ['name' => 'Sedad', 'type' => 'sedad', 'category' => 'mobile', 'changeDue' => false],
        ];

        foreach ($types as $t) {
            $payment = new Payment();
            $payment->setName($t['name']);
            $payment->setType($t['type']);
            $payment->setCategory($t['category']);
            $payment->setCanHaveChangeDue($t['changeDue']);
            $payment->addStore($store);
            $entityManager->persist($payment);
        }

        $entityManager->flush();

        return new JsonResponse([
            'success' => true,
            'message' => 'System activated successfully.',
        ]);
    }
}
