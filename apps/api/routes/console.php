<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command(
    'inspire',
    function (): void {
        $this->comment(
            \Illuminate\Foundation\Inspiring::quote(),
        );
    },
)->purpose(
    'Display an inspiring quote',
);

if (
    (bool) config(
        'backup.automatic_enabled',
        false,
    )
) {
    Schedule::command(
        'backup:database --prune',
    )
        ->dailyAt(
            (string) config(
                'backup.automatic_time',
                '02:00',
            ),
        )
        ->withoutOverlapping()
        ->onOneServer();
}
