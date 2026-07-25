<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->group(function (): void {
        /*
         * Public API health check.
         */
        Route::get(
            '/health',
            function (): JsonResponse {
                return response()->json([
                    'status' => 'ok',
                    'application' => 'Samarakoon Agro POS API',
                    'timestamp' => now()->toISOString(),
                ]);
            },
        );

        /*
         * Public authentication routes.
         */
        Route::post(
            '/auth/login',
            [
                AuthController::class,
                'login',
            ],
        )->middleware('throttle:10,1');

        /*
         * Authenticated routes.
         */
        Route::middleware('auth:sanctum')
            ->group(function (): void {
                Route::get(
                    '/auth/me',
                    [
                        AuthController::class,
                        'me',
                    ],
                );

                Route::post(
                    '/auth/logout',
                    [
                        AuthController::class,
                        'logout',
                    ],
                );

                /*
                 * Routes available to both
                 * administrators and cashiers.
                 */
                Route::middleware(
                    'role:admin,cashier',
                )->group(function (): void {
                    /*
                     * POS routes.
                     */
                    Route::get(
                        '/pos/categories',
                        [
                            PosController::class,
                            'categories',
                        ],
                    );

                    Route::get(
                        '/pos/products',
                        [
                            PosController::class,
                            'index',
                        ],
                    );

                    Route::get(
                        '/pos/products/{product}',
                        [
                            PosController::class,
                            'show',
                        ],
                    );

                    /*
                     * Inventory and stock-price
                     * batch routes.
                     */
                    Route::get(
                        '/stock/products',
                        [
                            StockController::class,
                            'index',
                        ],
                    );

                    Route::get(
                        '/stock/products/{product}/price-options',
                        [
                            StockController::class,
                            'priceOptions',
                        ],
                    );

                    /*
                     * Sales routes.
                     *
                     * Administrators can view all
                     * sales.
                     *
                     * Cashiers can only view sales
                     * created using their account.
                     *
                     * This access control is handled
                     * inside SaleController.
                     */
                    Route::apiResource(
                        'sales',
                        SaleController::class,
                    )->only([
                        'index',
                        'store',
                        'show',
                    ]);
                });

                /*
                 * Administrator-only routes.
                 */
                Route::middleware('role:admin')
                    ->group(function (): void {
                        Route::get(
                            '/admin/access-check',
                            function (): JsonResponse {
                                return response()->json([
                                    'message' => 'Admin access confirmed.',
                                ]);
                            },
                        );

                        /*
                         * Dropdown option routes.
                         *
                         * These routes must be placed
                         * before the API resource
                         * routes so "options" is not
                         * treated as a model ID.
                         */
                        Route::get(
                            '/categories/options',
                            [
                                CategoryController::class,
                                'options',
                            ],
                        );

                        Route::get(
                            '/products/options',
                            [
                                ProductController::class,
                                'options',
                            ],
                        );

                        Route::get(
                            '/suppliers/options',
                            [
                                SupplierController::class,
                                'options',
                            ],
                        );

                        /*
                         * Purchase stock-intake route.
                         */
                        Route::post(
                            '/purchases/{purchase}/receive',
                            [
                                PurchaseController::class,
                                'receive',
                            ],
                        );

                        /*
                         * Administrator CRUD routes.
                         */
                        Route::apiResource(
                            'categories',
                            CategoryController::class,
                        );

                        Route::apiResource(
                            'products',
                            ProductController::class,
                        );

                        Route::apiResource(
                            'suppliers',
                            SupplierController::class,
                        );

                        Route::apiResource(
                            'purchases',
                            PurchaseController::class,
                        );
                    });

                /*
                 * Cashier access-check route.
                 */
                Route::middleware(
                    'role:admin,cashier',
                )
                    ->prefix('cashier')
                    ->group(function (): void {
                        Route::get(
                            '/access-check',
                            function (): JsonResponse {
                                return response()->json([
                                    'message' => 'Cashier access confirmed.',
                                ]);
                            },
                        );
                    });
            });
    });
