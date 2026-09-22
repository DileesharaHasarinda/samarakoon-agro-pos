<?php

namespace Database\Seeders;

use App\Models\ProductUnit;
use Illuminate\Database\Seeder;

class ProductUnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            'Piece',
            'Packet',
            'Bag',
            'Bottle',
            'Box',
            'Tin',
            'Kilogram',
            'Gram',
            'Litre',
            'Millilitre',
            'Metre',
            'Foot',
            'Roll',
            'Set',
            'Pair',
            'Dozen',
        ];

        foreach ($units as $unit) {
            ProductUnit::query()
                ->firstOrCreate([
                    'name' => $unit,
                ]);
        }
    }
}
