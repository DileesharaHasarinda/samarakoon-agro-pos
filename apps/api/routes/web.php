<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'application' => 'Samarakoon Agricultural POS API',
        'message' => 'API is running.',
    ]);
});

Route::get('/api/health', function () {
    try {
        DB::select('SELECT 1');

        return response()
            ->json([
                'status' => 'ok',
                'application' => 'Samarakoon Agricultural POS API',
                'shop' => 'Samarakoon',
                'database' => 'connected',
                'version' => '0.1.0',
            ])
            ->header('Access-Control-Allow-Origin', '*');
    } catch (\Throwable $exception) {
        return response()
            ->json([
                'status' => 'error',
                'application' => 'Samarakoon Agricultural POS API',
                'shop' => 'Samarakoon',
                'database' => 'disconnected',
                'version' => '0.1.0',
                'message' => $exception->getMessage(),
            ], 503)
            ->header('Access-Control-Allow-Origin', '*');
    }
});
