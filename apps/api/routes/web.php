<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'application' => 'Samarakoon Agricultural POS API',
        'message' => 'API is running.',
        'health_url' => '/api/v1/health',
    ]);
});
