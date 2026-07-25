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
                'name' => 'Tools and Equipment',
                'description' =>
                'Agricultural hand tools, machines and equipment.',
            ],

            [
                'name' => 'Irrigation Supplies',
                'description' =>
                'Pipes, fittings, pumps and irrigation accessories.',
            ],

            [
                'name' => 'Animal Feed',
                'description' =>
                'Feed products for livestock and poultry.',
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
