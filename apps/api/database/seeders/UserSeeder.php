<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            [
                'username' => 'admin',
            ],
            [
                'name' => 'Samarakoon Owner',
                'email' => 'owner@samarakoon.lk',
                'password' => Hash::make(
                    'Admin@12345',
                ),
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ],
        );

        User::query()->updateOrCreate(
            [
                'username' => 'cashier',
            ],
            [
                'name' => 'Samarakoon Cashier',
                'email' => 'cashier@samarakoon.lk',
                'password' => Hash::make(
                    'Cashier@12345',
                ),
                'role' => User::ROLE_CASHIER,
                'is_active' => true,
            ],
        );
    }
}
