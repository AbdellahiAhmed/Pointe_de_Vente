<?php

namespace App\DataFixtures;

use App\Entity\Tax;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class Taxes extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $tax = new Tax();
        $tax->setRate(16);
        $tax->setName('VAT');
        $tax->addStore($this->getReference('store', \App\Entity\Store::class));
        $manager->persist($tax);

        $tax = new Tax();
        $tax->setRate(20);
        $tax->setName('VAT');
        $tax->addStore($this->getReference('store', \App\Entity\Store::class));
        $manager->persist($tax);

        $tax = new Tax();
        $tax->setRate(5);
        $tax->setName('VAT');
        $tax->addStore($this->getReference('store', \App\Entity\Store::class));
        $manager->persist($tax);

        $manager->flush();
    }
}
