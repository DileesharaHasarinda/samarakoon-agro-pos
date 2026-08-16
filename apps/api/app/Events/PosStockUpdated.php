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
     *     updated_at: string|null
     * }> $batches
     */
    public function __construct(
        public readonly int $saleId,
        public readonly string $saleNumber,
        public readonly array $batches,
    ) {}

    /**
     * Broadcast only to authenticated POS users.
     *
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

    /**
     * Event name received by the desktop application.
     */
    public function broadcastAs(): string
    {
        return 'stock.updated';
    }

    /**
     * Keep the message deliberately small.
     *
     * We do NOT send:
     * - cart information
     * - customer information
     * - payment information
     * - entire sale information
     *
     * Only the new stock quantities are sent.
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

            'batches' =>
            $this->batches,
        ];
    }
}
