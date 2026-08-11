<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * =====================================================
         * PRODUCT VARIANTS
         * =====================================================
         *
         * Example:
         *
         * Product:
         * Tomato Seeds
         *
         * Variants:
         * 100 g Packet
         * 200 g Packet
         * 500 g Packet
         */
        if (
            ! Schema::hasTable(
                'product_variants',
            )
        ) {
            Schema::create(
                'product_variants',
                function (
                    Blueprint $table,
                ): void {
                    $table->id();

                    $table
                        ->foreignId(
                            'product_id',
                        )
                        ->constrained(
                            'products',
                        )
                        ->cascadeOnDelete();

                    /*
                     * Human-friendly optional name.
                     *
                     * Examples:
                     *
                     * 100g Packet
                     * 200g Packet
                     * 1L Bottle
                     */
                    $table
                        ->string(
                            'name',
                            160,
                        )
                        ->nullable();

                    /*
                     * Numeric size.
                     *
                     * Examples:
                     *
                     * 100
                     * 200
                     * 500
                     * 1
                     */
                    $table->decimal(
                        'size_value',
                        14,
                        3,
                    );

                    /*
                     * Measurement unit.
                     *
                     * Examples:
                     *
                     * g
                     * kg
                     * ml
                     * L
                     */
                    $table->string(
                        'size_unit',
                        40,
                    );

                    /*
                     * Physical package type.
                     *
                     * Examples:
                     *
                     * Packet
                     * Bottle
                     * Bag
                     * Box
                     */
                    $table->string(
                        'package_unit',
                        40,
                    );

                    /*
                     * Each variant receives its own SKU.
                     */
                    $table
                        ->string(
                            'sku',
                            100,
                        )
                        ->nullable()
                        ->unique();

                    /*
                     * Optional individual barcode.
                     */
                    $table
                        ->string(
                            'barcode',
                            120,
                        )
                        ->nullable()
                        ->unique();

                    $table
                        ->boolean(
                            'is_active',
                        )
                        ->default(true);

                    $table->timestamps();

                    /*
                     * Prevent duplicate package definitions
                     * inside the same product.
                     *
                     * Example:
                     *
                     * Tomato Seeds cannot accidentally have
                     * two identical 100 g Packet variants.
                     */
                    $table->unique(
                        [
                            'product_id',
                            'size_value',
                            'size_unit',
                            'package_unit',
                        ],
                        'product_variants_unique_size',
                    );

                    $table->index(
                        [
                            'product_id',
                            'is_active',
                        ],
                        'product_variants_product_active_index',
                    );
                },
            );
        }

        /*
         * =====================================================
         * PURCHASE ITEMS
         * =====================================================
         */
        if (
            Schema::hasTable(
                'purchase_items',
            )
            && ! Schema::hasColumn(
                'purchase_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'purchase_items',
                function (
                    Blueprint $table,
                ): void {
                    $table
                        ->foreignId(
                            'product_variant_id',
                        )
                        ->nullable()
                        ->after(
                            'product_id',
                        )
                        ->constrained(
                            'product_variants',
                        )
                        ->restrictOnDelete();

                    $table->index(
                        [
                            'product_id',
                            'product_variant_id',
                        ],
                        'purchase_items_product_variant_index',
                    );
                },
            );
        }

        /*
         * =====================================================
         * STOCK BATCHES
         * =====================================================
         */
        if (
            Schema::hasTable(
                'stock_batches',
            )
            && ! Schema::hasColumn(
                'stock_batches',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'stock_batches',
                function (
                    Blueprint $table,
                ): void {
                    $table
                        ->foreignId(
                            'product_variant_id',
                        )
                        ->nullable()
                        ->after(
                            'product_id',
                        )
                        ->constrained(
                            'product_variants',
                        )
                        ->restrictOnDelete();

                    $table->index(
                        [
                            'product_id',
                            'product_variant_id',
                            'selling_price',
                        ],
                        'stock_batches_product_variant_price_index',
                    );

                    $table->index(
                        [
                            'product_id',
                            'product_variant_id',
                            'expiry_date',
                        ],
                        'stock_batches_product_variant_expiry_index',
                    );
                },
            );
        }

        /*
         * =====================================================
         * SALE ITEMS
         * =====================================================
         */
        if (
            Schema::hasTable(
                'sale_items',
            )
            && ! Schema::hasColumn(
                'sale_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'sale_items',
                function (
                    Blueprint $table,
                ): void {
                    $table
                        ->foreignId(
                            'product_variant_id',
                        )
                        ->nullable()
                        ->after(
                            'product_id',
                        )
                        ->constrained(
                            'product_variants',
                        )
                        ->restrictOnDelete();

                    $table->index(
                        [
                            'product_id',
                            'product_variant_id',
                        ],
                        'sale_items_product_variant_index',
                    );
                },
            );
        }

        /*
         * =====================================================
         * SALE RETURN ITEMS
         * =====================================================
         */
        if (
            Schema::hasTable(
                'sale_return_items',
            )
            && ! Schema::hasColumn(
                'sale_return_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'sale_return_items',
                function (
                    Blueprint $table,
                ): void {
                    $table
                        ->foreignId(
                            'product_variant_id',
                        )
                        ->nullable()
                        ->after(
                            'product_id',
                        )
                        ->constrained(
                            'product_variants',
                        )
                        ->restrictOnDelete();

                    $table->index(
                        [
                            'product_id',
                            'product_variant_id',
                        ],
                        'sale_return_items_product_variant_index',
                    );
                },
            );
        }

        /*
         * Compatibility with an older possible
         * table name.
         */
        if (
            Schema::hasTable(
                'sales_return_items',
            )
            && ! Schema::hasColumn(
                'sales_return_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'sales_return_items',
                function (
                    Blueprint $table,
                ): void {
                    $table
                        ->foreignId(
                            'product_variant_id',
                        )
                        ->nullable()
                        ->after(
                            'product_id',
                        )
                        ->constrained(
                            'product_variants',
                        )
                        ->restrictOnDelete();

                    $table->index(
                        [
                            'product_id',
                            'product_variant_id',
                        ],
                        'sales_return_items_product_variant_index',
                    );
                },
            );
        }
    }

    public function down(): void
    {
        /*
         * Remove foreign keys from dependent
         * tables BEFORE dropping
         * product_variants.
         */

        if (
            Schema::hasTable(
                'sales_return_items',
            )
            && Schema::hasColumn(
                'sales_return_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'sales_return_items',
                function (
                    Blueprint $table,
                ): void {
                    $table->dropIndex(
                        'sales_return_items_product_variant_index',
                    );

                    $table->dropConstrainedForeignId(
                        'product_variant_id',
                    );
                },
            );
        }

        if (
            Schema::hasTable(
                'sale_return_items',
            )
            && Schema::hasColumn(
                'sale_return_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'sale_return_items',
                function (
                    Blueprint $table,
                ): void {
                    $table->dropIndex(
                        'sale_return_items_product_variant_index',
                    );

                    $table->dropConstrainedForeignId(
                        'product_variant_id',
                    );
                },
            );
        }

        if (
            Schema::hasTable(
                'sale_items',
            )
            && Schema::hasColumn(
                'sale_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'sale_items',
                function (
                    Blueprint $table,
                ): void {
                    $table->dropIndex(
                        'sale_items_product_variant_index',
                    );

                    $table->dropConstrainedForeignId(
                        'product_variant_id',
                    );
                },
            );
        }

        if (
            Schema::hasTable(
                'stock_batches',
            )
            && Schema::hasColumn(
                'stock_batches',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'stock_batches',
                function (
                    Blueprint $table,
                ): void {
                    $table->dropIndex(
                        'stock_batches_product_variant_price_index',
                    );

                    $table->dropIndex(
                        'stock_batches_product_variant_expiry_index',
                    );

                    $table->dropConstrainedForeignId(
                        'product_variant_id',
                    );
                },
            );
        }

        if (
            Schema::hasTable(
                'purchase_items',
            )
            && Schema::hasColumn(
                'purchase_items',
                'product_variant_id',
            )
        ) {
            Schema::table(
                'purchase_items',
                function (
                    Blueprint $table,
                ): void {
                    $table->dropIndex(
                        'purchase_items_product_variant_index',
                    );

                    $table->dropConstrainedForeignId(
                        'product_variant_id',
                    );
                },
            );
        }

        Schema::dropIfExists(
            'product_variants',
        );
    }
};
