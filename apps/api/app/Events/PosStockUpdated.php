<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PosStockUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    /**
     * @param array<int, array{
     *     id: int,
     *     product_id: int,
     *     product_variant_id: int|null,
     *     available_quantity: float,
     *     selling_price?: float|null,
     *     secondary_selling_price?: float|null,
     *     is_dual_unit?: bool,
     *     primary_unit?: string|null,
     *     stock_unit?: string|null,
     *     secondary_unit?: string|null,
     *     conversion_factor?: float|null,
     *     updated_at: string|null
     * }> $batches
     */
    public function __construct(
        public readonly int $saleId,
        public readonly string $saleNumber,
        public readonly array $batches,
        public readonly string $source = 'sale',
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(
                'pos.stock',
            ),
        ];
    }

    public function broadcastAs(): string
    {
        return 'stock.updated';
    }

    /**
     * The payload stays intentionally small.
     *
     * Normal sales may still send only stock quantities.
     * Admin stock-batch edits can additionally send prices so
     * cashier carts can immediately adopt the new price.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'sale_id' =>
            $this->saleId,

            'sale_number' =>
            $this->saleNumber,

            'source' =>
            $this->source,

            'batches' =>
            $this->batches,
        ];
    }
}
