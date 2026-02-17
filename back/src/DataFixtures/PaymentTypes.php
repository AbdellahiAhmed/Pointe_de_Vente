<?php

namespace App\DataFixtures;

use App\Entity\Payment;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class PaymentTypes extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $types = [
            ['name' => 'Espèces', 'type' => 'cash', 'category' => 'cash', 'changeDue' => true],
            ['name' => 'Carte Bancaire', 'type' => 'credit card', 'category' => 'mobile', 'changeDue' => false],
            ['name' => 'Crédit Client', 'type' => 'credit', 'category' => 'credit', 'changeDue' => false],
            ['name' => 'Bankily', 'type' => 'bankily', 'category' => 'mobile', 'changeDue' => false],
            ['name' => 'Masrivi', 'type' => 'masrivi', 'category' => 'mobile', 'changeDue' => false],
            ['name' => 'Sedad', 'type' => 'sedad', 'category' => 'mobile', 'changeDue' => false],
        ];

        foreach($types as $t){
            $paymentType = new Payment();
            $paymentType->setName($t['name']);
            $paymentType->setType($t['type']);
            $paymentType->setCategory($t['category']);
            $paymentType->setCanHaveChangeDue($t['changeDue']);
            $paymentType->addStore($this->getReference('store', \App\Entity\Store::class));

            $manager->persist($paymentType);
        }

        $manager->flush();
    }
}
