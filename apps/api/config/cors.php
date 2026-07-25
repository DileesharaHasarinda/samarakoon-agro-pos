<?php

return [
    /*
     * These settings are suitable for local development
     * with Electron and Vite.
     */
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
    ],

    'allowed_methods' => [
        '*',
    ],

    'allowed_origins' => [
        '*',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        '*',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
     * This authentication implementation uses
     * bearer tokens instead of cookies.
     */
    'supports_credentials' => false,
];
