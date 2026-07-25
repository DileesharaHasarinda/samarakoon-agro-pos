<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $fertilizerCategory =
            Category::query()
            ->where(
                'name',
                'Fertilizers',
            )
            ->first();

        $seedCategory =
            Category::query()
            ->where(
                'name',
                'Seeds',
            )
            ->first();

        $agrochemicalCategory =
            Category::query()
            ->where(
                'name',
                'Agrochemicals',
            )
            ->first();

        if ($fertilizerCategory) {
            Product::query()->updateOrCreate(
                [
                    'category_id' =>
                    $fertilizerCategory->id,

                    'name' =>
                    'Urea Fertilizer 50kg',
                ],
                [
                    'sku' => 'FER-001',
                    'barcode' => null,

                    'description' =>
                    'Urea fertilizer supplied in a 50kg bag.',

                    'cost_price' => 8000,
                    'selling_price' => 8500,
                    'reorder_level' => 10,
                    'unit' => 'Bag',
                    'expiry_date' => null,
                ],
            );
        }

        if ($seedCategory) {
            Product::query()->updateOrCreate(
                [
                    'category_id' =>
                    $seedCategory->id,

                    'name' =>
                    'Tomato Seeds 100g',
                ],
                [
                    'sku' => null,
                    'barcode' => null,

                    'description' =>
                    'Tomato seeds supplied in a 100g packet.',

                    'cost_price' => 250,
                    'selling_price' => 350,
                    'reorder_level' => 20,
                    'unit' => 'Packet',

                    'expiry_date' =>
                    now()
                        ->addMonths(18)
                        ->toDateString(),
                ],
            );
        }

        if ($agrochemicalCategory) {
            Product::query()->updateOrCreate(
                [
                    'category_id' =>
                    $agrochemicalCategory->id,

                    'name' =>
                    'Crop Protection Liquid 1L',
                ],
                [
                    'sku' => 'AGR-001',

                    'barcode' =>
                    '4790000000012',

                    'description' =>
                    'Crop protection liquid supplied in a one-litre bottle.',

                    'cost_price' => 1200,
                    'selling_price' => 1450,
                    'reorder_level' => 8,
                    'unit' => 'Bottle',

                    'expiry_date' =>
                    now()
                        ->addMonths(24)
                        ->toDateString(),
                ],
            );
        }
    }
}
