<?php

namespace App\Command;

use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

class FixBarcodesCommand extends Command
{
    protected static $defaultName = 'app:fix-barcodes';
    protected static $defaultDescription = 'Fix barcode numbers';

    private $entityManager;

    public function __construct(
        EntityManagerInterface $entityManager,
        string $name = null
    )
    {
        parent::__construct($name);
        $this->entityManager = $entityManager;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $items = $this->entityManager->getRepository(Product::class)->findBy([]);
        foreach($items as $k => $item){
            $item->setBarcode(11111111 + $k);
            $this->entityManager->persist($item);
        }

        $this->entityManager->flush();

        $io->success('barcodes fixed');

        return Command::SUCCESS;
    }
}
