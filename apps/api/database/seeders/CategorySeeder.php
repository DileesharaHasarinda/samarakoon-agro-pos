<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Fertilizers',
                'description' =>
                'Organic and chemical fertilizers for agricultural crops.',
            ],

            [
                'name' => 'Seeds',
                'description' =>
                'Vegetable, fruit, grain and other agricultural seeds.',
            ],

            [
                'name' => 'Agrochemicals',
                'description' =>
                'Agricultural chemicals and crop protection products.',
            ],

            [
                'name' => 'Agro Tools and Equipment',
                'description' =>
                'Agricultural hand tools, machines and equipment.',
            ],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(
                [
                    'name' => $category['name'],
                ],
                [
                    'description' =>
                    $category['description'],
                ],
            );
        }
    }
}
