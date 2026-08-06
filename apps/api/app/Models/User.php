<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    public const ROLE_ADMIN = 'admin';

    public const ROLE_CASHIER = 'cashier';

    public const ROLE_RESTRICTED_CASHIER = 'restricted_cashier';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'is_active',
        'last_login_at',
        'restricted_category_ids',
    ];

    /**
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'restricted_category_ids' => 'array',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isCashier(): bool
    {
        return $this->role === self::ROLE_CASHIER;
    }

    public function isRestrictedCashier(): bool
    {
        return $this->role === self::ROLE_RESTRICTED_CASHIER;
    }

    /**
     * True for any user who is allowed to see every category
     * (admins and regular cashiers). Restricted cashiers are
     * limited to their assigned category list.
     */
    public function hasUnrestrictedCategoryAccess(): bool
    {
        return $this->isAdmin() || $this->isCashier();
    }

    /**
     * @return array<int, int>
     */
    public function restrictedCategoryIds(): array
    {
        if (! $this->isRestrictedCashier()) {
            return [];
        }

        $ids = $this->restricted_category_ids ?? [];

        return array_values(
            array_map('intval', $ids),
        );
    }

    public function canAccessCategory(int $categoryId): bool
    {
        if ($this->hasUnrestrictedCategoryAccess()) {
            return true;
        }

        return in_array(
            $categoryId,
            $this->restrictedCategoryIds(),
            true,
        );
    }
}
