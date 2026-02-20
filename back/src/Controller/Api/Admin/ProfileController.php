<?php

namespace App\Controller\Api\Admin;

use App\Core\User\Command\UpdateUserCommand\UpdateUserCommand;
use App\Core\User\Command\UpdateUserCommand\UpdateUserCommandHandlerInterface;
use App\Core\Dto\Common\User\UserDto;
use App\Factory\Controller\ApiResponseFactory;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/profile", name="admin_profile_")
 */
class ProfileController extends AbstractController
{
    /**
     * @Route("/update", methods={"POST"}, name="update")
     */
    public function update(
        Request $request,
        ApiResponseFactory $responseFactory,
        UpdateUserCommandHandlerInterface $handler
    )
    {
        $user = $this->getUser();
        if ($user === null) {
            return $responseFactory->unauthorized();
        }

        $data = json_decode($request->getContent(), true);

        $command = new UpdateUserCommand();
        $command->setId($user->getId());

        if (isset($data['displayName'])) {
            $command->setDisplayName($data['displayName']);
        }

        if (isset($data['email'])) {
            $command->setEmail($data['email']);
        }

        if (isset($data['password']) && !empty(trim($data['password']))) {
            $command->setPassword($data['password']);
        }

        $result = $handler->handle($command);

        if ($result->hasValidationError()) {
            return $responseFactory->validationError($result->getValidationError());
        }

        if ($result->isNotFound()) {
            return $responseFactory->notFound('User not found');
        }

        return $responseFactory->json([
            'user' => UserDto::createFromUser($result->getUser())
        ]);
    }
}
