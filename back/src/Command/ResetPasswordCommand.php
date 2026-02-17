<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ResetPasswordCommand extends Command
{
    protected static $defaultName = 'reset-password';
    protected static $defaultDescription = 'Reset given users password';

    private $entityManager;

    private $userPasswordHasher;

    public function __construct(
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $userPasswordHasher,
        string $name = null
    )
    {
        parent::__construct($name);
        $this->entityManager = $entityManager;
        $this->userPasswordHasher = $userPasswordHasher;
    }

    protected function configure(): void
    {
        $this
            ->addArgument('username', InputArgument::REQUIRED, 'Enter username')
            ->addArgument('password', InputArgument::REQUIRED, 'Enter new password')
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $username = $input->getArgument('username');
        $password = $input->getArgument('password');

        $user = $this->entityManager->getRepository(User::class)->findOneBy([
            'username' => $username
        ]);

        if($user){
            $user->setPassword($this->userPasswordHasher->hashPassword($user, $password));

            $this->entityManager->persist($user);
            $this->entityManager->flush();
        }

        $io->success('DONE');

        return Command::SUCCESS;
    }
}
