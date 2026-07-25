<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name' =>
                'Agro Lanka Suppliers',

                'contact_person' =>
                'Nimal Perera',

                'phone' =>
                '+94 77 123 4567',

                'secondary_phone' =>
                '+94 11 234 5678',

                'email' =>
                'sales@agrolanka.lk',

                'address' =>
                'No. 25, Kandy Road, Colombo.',

                'notes' =>
                'Main supplier for fertilizer products.',
            ],

            [
                'name' =>
                'Green Seed Distributors',

                'contact_person' =>
                'Kasun Silva',

                'phone' =>
                '+94 71 234 5678',

                'secondary_phone' =>
                null,

                'email' =>
                'orders@greenseeds.lk',

                'address' =>
                'Kurunegala, Sri Lanka.',

                'notes' =>
                'Supplier for vegetable and fruit seeds.',
            ],

            [
                'name' =>
                'Farm Care Trading',

                'contact_person' =>
                'Amal Fernando',

                'phone' =>
                '+94 76 345 6789',

                'secondary_phone' =>
                null,

                'email' =>
                null,

                'address' =>
                'Anuradhapura, Sri Lanka.',

                'notes' =>
                'Supplier for agricultural tools and irrigation items.',
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::query()
                ->updateOrCreate(
                    [
                        'name' =>
                        $supplier['name'],

                        'phone' =>
                        $supplier['phone'],
                    ],
                    [
                        'contact_person' =>
                        $supplier['contact_person'],

                        'secondary_phone' =>
                        $supplier['secondary_phone'],

                        'email' =>
                        $supplier['email'],

                        'address' =>
                        $supplier['address'],

                        'notes' =>
                        $supplier['notes'],
                    ],
                );
        }
    }
}
