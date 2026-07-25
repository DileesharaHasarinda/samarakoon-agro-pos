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
                'name' => 'System Administrator',
                'email' => 'admin@samarakoon.local',
                'password' => Hash::make('Admin@12345'),
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ],
        );

        User::query()->updateOrCreate(
            [
                'username' => 'cashier',
            ],
            [
                'name' => 'Main Cashier',
                'email' => 'cashier@samarakoon.local',
                'password' => Hash::make('Cashier@12345'),
                'role' => User::ROLE_CASHIER,
                'is_active' => true,
            ],
        );
    }
}
