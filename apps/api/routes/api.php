<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarcodeController;
use App\Http\Controllers\Api\BusinessSettingController;
use App\Http\Controllers\Api\CashierAccountController;
use App\Http\Controllers\Api\CashierShiftController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChequeController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerDueController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DatabaseBackupController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InventoryAlertController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SalesReturnController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierPayableController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->group(function (): void {
        /*
         * =====================================================
         * PUBLIC ROUTES
         * =====================================================
         */

        /*
         * Health check.
         */
        Route::get(
            '/health',
            function (): JsonResponse {
                return response()->json([
                    'status' =>
                    'ok',

                    'application' =>
                    'Samarakoon Agro POS API',

                    'timestamp' =>
                    now()->toISOString(),
                ]);
            },
        );

        /*
         * Login.
         */
        Route::post(
            '/auth/login',
            [
                AuthController::class,
                'login',
            ],
        )->middleware(
            'throttle:10,1',
        );

        /*
         * =====================================================
         * AUTHENTICATED ROUTES
         * =====================================================
         */
        Route::middleware(
            'auth:sanctum',
        )->group(function (): void {
            /*
             * Current user.
             */
            Route::get(
                '/auth/me',
                [
                    AuthController::class,
                    'me',
                ],
            );

            /*
             * Logout.
             */
            Route::post(
                '/auth/logout',
                [
                    AuthController::class,
                    'logout',
                ],
            );

            /*
             * =================================================
             * ADMIN + CASHIER
             * =================================================
             */
            Route::middleware(
                'role:admin,cashier',
            )->group(function (): void {
                /*
                 * Cashier dashboard.
                 */
                Route::get(
                    '/dashboard/cashier',
                    [
                        DashboardController::class,
                        'cashier',
                    ],
                );

                /*
                 * Business settings used by
                 * receipts and invoices.
                 */
                Route::get(
                    '/business-settings',
                    [
                        BusinessSettingController::class,
                        'show',
                    ],
                );

                /*
                 * =================================================
                 * POS
                 * =================================================
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
                 * =================================================
                 * STOCK
                 * =================================================
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
                 * =================================================
                 * CUSTOMERS
                 * =================================================
                 */

                /*
                 * Static route before resource
                 * routes.
                 */
                Route::get(
                    '/customers/options',
                    [
                        CustomerController::class,
                        'options',
                    ],
                );

                Route::apiResource(
                    'customers',
                    CustomerController::class,
                )->only([
                    'index',
                    'store',
                    'show',
                    'update',
                ]);

                /*
                 * =================================================
                 * CUSTOMER DUES
                 * =================================================
                 */

                Route::get(
                    '/customer-dues',
                    [
                        CustomerDueController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/customer-dues/{sale}',
                    [
                        CustomerDueController::class,
                        'show',
                    ],
                );

                Route::post(
                    '/sales/{sale}/due-payments',
                    [
                        CustomerDueController::class,
                        'store',
                    ],
                )->middleware(
                    'shift.open',
                );

                /*
                 * =================================================
                 * SALES RETURNS
                 * =================================================
                 *
                 * These routes must remain before
                 * the dynamic /sales/{sale} route.
                 */

                Route::get(
                    '/sales/{sale}/return-options',
                    [
                        SalesReturnController::class,
                        'returnOptions',
                    ],
                );

                Route::post(
                    '/sales/{sale}/returns',
                    [
                        SalesReturnController::class,
                        'store',
                    ],
                )->middleware(
                    'shift.open',
                );

                Route::get(
                    '/sales-returns',
                    [
                        SalesReturnController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/sales-returns/{salesReturn}',
                    [
                        SalesReturnController::class,
                        'show',
                    ],
                );

                /*
                 * =================================================
                 * SALES
                 * =================================================
                 */

                Route::get(
                    '/sales',
                    [
                        SaleController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/sales',
                    [
                        SaleController::class,
                        'store',
                    ],
                )->middleware(
                    'shift.open',
                );

                Route::get(
                    '/sales/{sale}',
                    [
                        SaleController::class,
                        'show',
                    ],
                );

                /*
                 * =================================================
                 * CASHIER SHIFTS
                 * =================================================
                 *
                 * Static routes stay before the
                 * dynamic {cashierShift} routes.
                 */

                Route::get(
                    '/cashier-shifts/current',
                    [
                        CashierShiftController::class,
                        'current',
                    ],
                );

                Route::get(
                    '/cashier-shifts',
                    [
                        CashierShiftController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/cashier-shifts/open',
                    [
                        CashierShiftController::class,
                        'open',
                    ],
                );

                Route::get(
                    '/cashier-shifts/{cashierShift}',
                    [
                        CashierShiftController::class,
                        'show',
                    ],
                );

                Route::post(
                    '/cashier-shifts/{cashierShift}/close',
                    [
                        CashierShiftController::class,
                        'close',
                    ],
                );

                Route::post(
                    '/cashier-shifts/{cashierShift}/movements',
                    [
                        CashierShiftController::class,
                        'storeMovement',
                    ],
                );
            });

            /*
             * =================================================
             * ADMIN ONLY
             * =================================================
             */
            Route::middleware(
                'role:admin',
            )->group(function (): void {
                /*
                 * =================================================
                 * ADMIN DASHBOARD
                 * =================================================
                 */

                Route::get(
                    '/dashboard/admin',
                    [
                        DashboardController::class,
                        'admin',
                    ],
                );

                /*
                 * =================================================
                 * BUSINESS SETTINGS
                 * =================================================
                 */

                Route::put(
                    '/business-settings',
                    [
                        BusinessSettingController::class,
                        'update',
                    ],
                );

                /*
                 * =================================================
                 * REPORTS
                 * =================================================
                 */

                Route::get(
                    '/reports/overview',
                    [
                        ReportController::class,
                        'overview',
                    ],
                );

                /*
                 * =================================================
                 * DATABASE BACKUP & RESTORE
                 * =================================================
                 *
                 * All endpoints remain protected
                 * by:
                 *
                 * auth:sanctum
                 * role:admin
                 */

                /*
                 * List backup history.
                 */
                Route::get(
                    '/database-backups',
                    [
                        DatabaseBackupController::class,
                        'index',
                    ],
                );

                /*
                 * Create a new backup.
                 */
                Route::post(
                    '/database-backups',
                    [
                        DatabaseBackupController::class,
                        'store',
                    ],
                );

                /*
                 * Upload an external .sql file and
                 * restore it.
                 *
                 * The controller/service will:
                 *
                 * 1. Validate uploaded SQL
                 * 2. Save uploaded SQL locally
                 * 3. Copy uploaded SQL to R2
                 * 4. Create safety backup of the
                 *    CURRENT database
                 * 5. Copy safety backup to R2
                 * 6. Restore uploaded SQL
                 *
                 * IMPORTANT:
                 * Keep this static route before
                 * routes containing
                 * {databaseBackup}.
                 */
                Route::post(
                    '/database-backups/upload-restore',
                    [
                        DatabaseBackupController::class,
                        'uploadAndRestore',
                    ],
                );

                /*
                 * Download existing backup.
                 */
                Route::get(
                    '/database-backups/{databaseBackup}/download',
                    [
                        DatabaseBackupController::class,
                        'download',
                    ],
                );

                /*
                 * Restore existing backup.
                 */
                Route::post(
                    '/database-backups/{databaseBackup}/restore',
                    [
                        DatabaseBackupController::class,
                        'restore',
                    ],
                );

                /*
                 * Delete existing backup.
                 */
                Route::delete(
                    '/database-backups/{databaseBackup}',
                    [
                        DatabaseBackupController::class,
                        'destroy',
                    ],
                );

                /*
                 * =================================================
                 * BARCODE MANAGEMENT
                 * =================================================
                 */

                Route::get(
                    '/barcodes/products',
                    [
                        BarcodeController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/barcodes/generate-missing',
                    [
                        BarcodeController::class,
                        'generateMissing',
                    ],
                );

                Route::post(
                    '/products/{product}/barcode/generate',
                    [
                        BarcodeController::class,
                        'generate',
                    ],
                );

                Route::put(
                    '/products/{product}/barcode',
                    [
                        BarcodeController::class,
                        'update',
                    ],
                );

                /*
                 * =================================================
                 * INVENTORY ALERTS
                 * =================================================
                 */

                Route::get(
                    '/inventory-alerts',
                    [
                        InventoryAlertController::class,
                        'index',
                    ],
                );

                Route::put(
                    '/products/{product}/stock-settings',
                    [
                        InventoryAlertController::class,
                        'updateSettings',
                    ],
                );

                /*
                 * =================================================
                 * CHEQUES
                 * =================================================
                 *
                 * Static alerts route stays before
                 * dynamic cheque resource routes.
                 */

                Route::get(
                    '/cheques/alerts',
                    [
                        ChequeController::class,
                        'alerts',
                    ],
                );

                Route::patch(
                    '/cheques/{cheque}/status',
                    [
                        ChequeController::class,
                        'updateStatus',
                    ],
                );

                Route::apiResource(
                    'cheques',
                    ChequeController::class,
                );

                /*
                 * =================================================
                 * SUPPLIER PAYABLES
                 * =================================================
                 */

                Route::get(
                    '/supplier-payables',
                    [
                        SupplierPayableController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/supplier-payables/{purchase}',
                    [
                        SupplierPayableController::class,
                        'show',
                    ],
                );

                Route::put(
                    '/purchases/{purchase}/settlement',
                    [
                        SupplierPayableController::class,
                        'configure',
                    ],
                );

                Route::post(
                    '/purchases/{purchase}/supplier-payments',
                    [
                        SupplierPayableController::class,
                        'storePayment',
                    ],
                );

                /*
                 * =================================================
                 * CUSTOMER ADMIN OPERATIONS
                 * =================================================
                 */

                Route::delete(
                    '/customers/{customer}',
                    [
                        CustomerController::class,
                        'destroy',
                    ],
                );

                /*
                 * =================================================
                 * ADMIN ACCESS TEST
                 * =================================================
                 */

                Route::get(
                    '/admin/access-check',
                    function (): JsonResponse {
                        return response()->json([
                            'message' =>
                            'Admin access confirmed.',
                        ]);
                    },
                );

                /*
                 * =================================================
                 * STATIC DROPDOWN ROUTES
                 * =================================================
                 *
                 * Keep these before dynamic
                 * resource routes.
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

                Route::get(
                    '/expense-categories/options',
                    [
                        ExpenseCategoryController::class,
                        'options',
                    ],
                );

                /*
                 * =================================================
                 * PURCHASE RECEIVING
                 * =================================================
                 */

                Route::post(
                    '/purchases/{purchase}/receive',
                    [
                        PurchaseController::class,
                        'receive',
                    ],
                );

                /*
                 * =================================================
                 * CORE ADMIN RESOURCES
                 * =================================================
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

                Route::apiResource(
                    'expense-categories',
                    ExpenseCategoryController::class,
                );

                Route::apiResource(
                    'expenses',
                    ExpenseController::class,
                );

                /*
                 * =================================================
                 * CASHIER ACCOUNT MANAGEMENT
                 * =================================================
                 */

                Route::get(
                    '/cashiers',
                    [
                        CashierAccountController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/cashiers',
                    [
                        CashierAccountController::class,
                        'store',
                    ],
                );

                Route::get(
                    '/cashiers/{cashier}',
                    [
                        CashierAccountController::class,
                        'show',
                    ],
                );

                Route::put(
                    '/cashiers/{cashier}',
                    [
                        CashierAccountController::class,
                        'update',
                    ],
                );

                Route::patch(
                    '/cashiers/{cashier}/status',
                    [
                        CashierAccountController::class,
                        'updateStatus',
                    ],
                );

                Route::put(
                    '/cashiers/{cashier}/password',
                    [
                        CashierAccountController::class,
                        'resetPassword',
                    ],
                );
            });
        });
    });
