<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', function () {
        try {
            DB::select('SELECT 1');

            return response()->json([
                'status' => 'ok',
                'application' => 'Samarakoon Agricultural POS API',
                'shop' => 'Samarakoon',
                'database' => 'connected',
                'version' => '0.2.0',
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'status' => 'error',
                'application' => 'Samarakoon Agricultural POS API',
                'shop' => 'Samarakoon',
                'database' => 'disconnected',
                'message' => $exception->getMessage(),
            ], 503);
        }
    });

    Route::post(
        '/auth/login',
        [AuthController::class, 'login'],
    )->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')
        ->group(function (): void {
            Route::get(
                '/auth/me',
                [AuthController::class, 'me'],
            );

            Route::post(
                '/auth/logout',
                [AuthController::class, 'logout'],
            );

            Route::get(
                '/admin/access-check',
                function (Request $request) {
                    return response()->json([
                        'message' => 'Admin access confirmed.',
                        'user' => $request->user(),
                    ]);
                },
            )->middleware('role:admin');

            Route::get(
                '/cashier/access-check',
                function (Request $request) {
                    return response()->json([
                        'message' => 'POS access confirmed.',
                        'user' => $request->user(),
                    ]);
                },
            )->middleware(
                'role:admin,cashier',
            );
        });
});
