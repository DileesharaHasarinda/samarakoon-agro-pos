<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(
        LoginRequest $request,
    ): JsonResponse {
        $validated = $request->validated();

        $user = User::query()
            ->where(
                'username',
                $validated['username'],
            )
            ->first();

        if (
            ! $user ||
            ! Hash::check(
                $validated['password'],
                $user->password,
            )
        ) {
            return response()->json([
                'message' => 'Invalid username or password.',
                'errors' => [
                    'username' => [
                        'Invalid username or password.',
                    ],
                ],
            ], 422);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'This account has been deactivated.',
            ], 403);
        }

        /*
         * Remove previous tokens so each user has
         * only one active POS session.
         */
        $user->tokens()->delete();

        $abilities = $user->isAdmin()
            ? ['admin', 'cashier']
            : ['cashier'];

        $token = $user
            ->createToken(
                $validated['device_name']
                    ?? 'Samarakoon POS Desktop',
                $abilities,
            )
            ->plainTextToken;

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $user->refresh();

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userData($user),
        ]);
    }

    public function me(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'user' => $this->userData($user),
        ]);
    }

    public function logout(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $currentToken = $user->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }

    private function userData(
        User $user,
    ): array {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => $user->is_active,
            'last_login_at' => $user
                ->last_login_at
                ?->toISOString(),
        ];
    }
}
