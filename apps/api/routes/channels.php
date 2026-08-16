<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel(
    'pos.stock',
    function (
        User $user,
    ): bool {
        return (
            $user->isAdmin()
            || $user->isCashier()
        );
    },
);
