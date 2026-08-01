<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Backup storage
    |--------------------------------------------------------------------------
    */

    'disk' =>
    env(
        'DATABASE_BACKUP_DISK',
        'local',
    ),

    'directory' =>
    env(
        'DATABASE_BACKUP_DIRECTORY',
        'database-backups',
    ),

    /*
    |--------------------------------------------------------------------------
    | MySQL command paths
    |--------------------------------------------------------------------------
    |
    | Use only the command name when MySQL is available in PATH.
    |
    | Homebrew examples:
    | /opt/homebrew/bin/mysqldump
    | /opt/homebrew/bin/mysql
    |
    | XAMPP examples:
    | /Applications/XAMPP/xamppfiles/bin/mysqldump
    | /Applications/XAMPP/xamppfiles/bin/mysql
    |
    */

    'mysqldump_binary' =>
    env(
        'MYSQLDUMP_BINARY',
        'mysqldump',
    ),

    'mysql_binary' =>
    env(
        'MYSQL_BINARY',
        'mysql',
    ),

    /*
    |--------------------------------------------------------------------------
    | Processing
    |--------------------------------------------------------------------------
    */

    'timeout_seconds' =>
    (int) env(
        'DATABASE_BACKUP_TIMEOUT',
        900,
    ),

    /*
    |--------------------------------------------------------------------------
    | Automatic backup
    |--------------------------------------------------------------------------
    */

    'automatic_enabled' =>
    filter_var(
        env(
            'DATABASE_BACKUP_AUTOMATIC',
            false,
        ),
        FILTER_VALIDATE_BOOL,
    ),

    'automatic_time' =>
    env(
        'DATABASE_BACKUP_TIME',
        '02:00',
    ),

    'retention_days' =>
    (int) env(
        'DATABASE_BACKUP_RETENTION_DAYS',
        30,
    ),

    /*
    |--------------------------------------------------------------------------
    | Off-site cloud upload (Cloudflare R2)
    |--------------------------------------------------------------------------
    |
    | When enabled, every backup created is also uploaded to the "r2"
    | filesystem disk (see config/filesystems.php), so backups survive
    | even if this machine's disk is lost or damaged.
    |
    */

    'cloud_upload_enabled' =>
    filter_var(
        env(
            'DATABASE_BACKUP_CLOUD_UPLOAD',
            false,
        ),
        FILTER_VALIDATE_BOOL,
    ),

    'cloud_disk' =>
    env(
        'DATABASE_BACKUP_CLOUD_DISK',
        'r2',
    ),
];
