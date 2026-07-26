<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(
        LoginRequest $request,
    ): JsonResponse {
        $validated =
            $request->validated();

        $username =
            strtolower(
                trim(
                    (string) $validated['username'],
                ),
            );

        $user =
            User::query()
            ->where(
                'username',
                $username,
            )
            ->first();

        if (
            ! $user
            || ! Hash::check(
                $validated['password'],
                $user->password,
            )
        ) {
            return response()->json([
                'message' =>
                'Invalid username or password.',

                'errors' => [
                    'username' => [
                        'Invalid username or password.',
                    ],
                ],
            ], 422);
        }

        /*
         * Prevent deactivated users from logging in.
         * Existing access tokens are also removed.
         */
        if (! (bool) $user->is_active) {
            $user
                ->tokens()
                ->delete();

            return response()->json([
                'message' =>
                'This account has been deactivated.',

                'errors' => [
                    'username' => [
                        'This account has been deactivated. Contact the administrator.',
                    ],
                ],
            ], 403);
        }

        /*
         * Keep only one active POS session
         * for each user account.
         */
        $user
            ->tokens()
            ->delete();

        $abilities =
            $user->isAdmin()
            ? [
                'admin',
                'cashier',
            ]
            : [
                'cashier',
            ];

        $deviceName =
            trim(
                (string) (
                    $validated['device_name']
                    ?? 'Samarakoon POS Desktop'
                ),
            );

        if ($deviceName === '') {
            $deviceName =
                'Samarakoon POS Desktop';
        }

        $token =
            $user
            ->createToken(
                $deviceName,
                $abilities,
            )
            ->plainTextToken;

        $user->forceFill([
            'last_login_at' =>
            now(),
        ]);

        $user->save();
        $user->refresh();

        return response()->json([
            'message' =>
            'Login successful.',

            'token' =>
            $token,

            'token_type' =>
            'Bearer',

            'user' =>
            $this->userData(
                $user,
            ),
        ]);
    }

    public function me(
        Request $request,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        /*
         * Immediately reject users whose
         * account was deactivated after login.
         */
        if (! (bool) $user->is_active) {
            $user
                ->tokens()
                ->delete();

            return response()->json([
                'message' =>
                'This account has been deactivated.',
            ], 403);
        }

        return response()->json([
            'user' =>
            $this->userData(
                $user,
            ),
        ]);
    }

    public function logout(
        Request $request,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $currentToken =
            $user->currentAccessToken();

        if (
            $currentToken
            instanceof PersonalAccessToken
        ) {
            $currentToken->delete();
        }

        return response()->json([
            'message' =>
            'Logout successful.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function userData(
        User $user,
    ): array {
        return [
            'id' =>
            $user->id,

            'name' =>
            $user->name,

            'username' =>
            $user->username,

            'email' =>
            $user->email,

            'phone' =>
            $user->phone,

            'role' =>
            $user->role,

            'is_active' =>
            (bool) $user->is_active,

            'last_login_at' =>
            $user->last_login_at
                ? Carbon::parse(
                    $user->last_login_at,
                )->toISOString()
                : null,

            'created_at' =>
            $user->created_at
                ? Carbon::parse(
                    $user->created_at,
                )->toISOString()
                : null,

            'updated_at' =>
            $user->updated_at
                ? Carbon::parse(
                    $user->updated_at,
                )->toISOString()
                : null,
        ];
    }
}
