<?php

namespace App\Http\Requests\Sale;

use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $reference =
            $this->input(
                'reference_number',
            );

        $notes =
            $this->input(
                'notes',
            );

        $dueDate =
            $this->input(
                'due_date',
            );

        $items = collect(
            $this->input(
                'items',
                [],
            ),
        )
            ->map(
                function (
                    mixed $item,
                ): array {
                    $item =
                        is_array($item)
                        ? $item
                        : [];

                    $saleUnit =
                        $item['sale_unit']
                        ?? null;

                    return [
                        ...$item,

                        'stock_batch_id' =>
                        isset(
                            $item['stock_batch_id'],
                        )
                            ? (int) $item['stock_batch_id']
                            : null,

                        'sale_unit' =>
                        is_string(
                            $saleUnit,
                        )
                            && trim(
                                $saleUnit,
                            ) !== ''
                            ? trim(
                                $saleUnit,
                            )
                            : null,

                        'discount' =>
                        $item['discount']
                            ?? 0,
                    ];
                },
            )
            ->all();

        /*
         * New POS clients send payments[] so one sale can be paid
         * using more than one method, for example:
         *
         * Cash          2,500
         * Card          1,500
         * Bank Transfer 1,000
         * Cheque        500
         *
         * During rollout, older clients may still send only the
         * legacy top-level payment_method + amount_received fields.
         * If payments[] is completely absent, convert that legacy
         * payload into one payment row automatically.
         */
        $rawPayments =
            $this->input(
                'payments',
            );

        if (! is_array($rawPayments)) {
            $legacyMethod =
                $this->input(
                    'payment_method',
                );

            $legacyAmount =
                (float) $this->input(
                    'amount_received',
                    0,
                );

            $rawPayments =
                is_string($legacyMethod)
                && trim($legacyMethod) !== ''
                && $legacyAmount > 0
                ? [
                    [
                        'payment_method' =>
                        trim($legacyMethod),

                        'amount' =>
                        $legacyAmount,

                        'reference_number' =>
                        $reference,

                        'notes' =>
                        null,
                    ],
                ]
                : [];
        }

        $payments = collect(
            $rawPayments,
        )
            ->map(
                function (
                    mixed $payment,
                ): array {
                    $payment =
                        is_array($payment)
                        ? $payment
                        : [];

                    $method =
                        $payment['payment_method']
                        ?? null;

                    $paymentReference =
                        $payment['reference_number']
                        ?? null;

                    $paymentNotes =
                        $payment['notes']
                        ?? null;

                    return [
                        'payment_method' =>
                        is_string($method)
                            && trim($method) !== ''
                            ? trim($method)
                            : null,

                        'amount' =>
                        $payment['amount']
                            ?? 0,

                        'reference_number' =>
                        is_string($paymentReference)
                            && trim($paymentReference) !== ''
                            ? trim($paymentReference)
                            : null,

                        'notes' =>
                        is_string($paymentNotes)
                            && trim($paymentNotes) !== ''
                            ? trim($paymentNotes)
                            : null,
                    ];
                },
            )
            ->all();

        $this->merge([
            'customer_id' =>
            $this->filled(
                'customer_id',
            )
                ? (int) $this->input(
                    'customer_id',
                )
                : null,

            /*
             * Keep the legacy fields available for backwards
             * compatibility. SaleController uses payments[] as the
             * authoritative source for new clients.
             */
            'payment_method' =>
            $this->filled(
                'payment_method',
            )
                ? trim(
                    (string) $this->input(
                        'payment_method',
                    ),
                )
                : null,

            'amount_received' =>
            $this->input(
                'amount_received',
                0,
            ),

            'payments' =>
            $payments,

            'due_date' =>
            is_string(
                $dueDate,
            )
                && trim(
                    $dueDate,
                ) !== ''
                ? trim(
                    $dueDate,
                )
                : null,

            'reference_number' =>
            is_string(
                $reference,
            )
                && trim(
                    $reference,
                ) !== ''
                ? trim(
                    $reference,
                )
                : null,

            'notes' =>
            is_string(
                $notes,
            )
                && trim(
                    $notes,
                ) !== ''
                ? trim(
                    $notes,
                )
                : null,

            'items' =>
            $items,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'customer_id' => [
                'nullable',
                'integer',
                'exists:customers,id',
            ],

            'settlement_type' => [
                'required',

                Rule::in([
                    Sale::SETTLEMENT_FULL,
                    Sale::SETTLEMENT_PARTIAL,
                    Sale::SETTLEMENT_DUE,
                ]),
            ],

            'payment_method' => [
                'nullable',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                    SalePayment::METHOD_CHEQUE,
                ]),
            ],

            'amount_received' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'payments' => [
                'present',
                'array',
                'max:4',
            ],

            'payments.*.payment_method' => [
                'required',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                    SalePayment::METHOD_CHEQUE,
                ]),
            ],

            'payments.*.amount' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            'payments.*.reference_number' => [
                'nullable',
                'string',
                'max:160',
            ],

            'payments.*.notes' => [
                'nullable',
                'string',
                'max:500',
            ],

            'due_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'discount' => [
                'required',
                'numeric',
                'min:0',
            ],

            'reference_number' => [
                'nullable',
                'string',
                'max:160',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:1500',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            /*
             * IMPORTANT:
             *
             * Do NOT use "distinct" here.
             *
             * A dual-unit stock batch can appear more
             * than once in the same sale:
             *
             * Batch 10 -> 2 Bag
             * Batch 10 -> 5 Kg
             *
             * Both lines use the same physical stock.
             */
            'items.*.stock_batch_id' => [
                'required',
                'integer',
                'exists:stock_batches,id',
            ],

            /*
             * IMPORTANT:
             *
             * sale_unit must survive validated().
             *
             * Examples:
             * Bag
             * Kg
             * Unit
             * Bottle
             * Piece
             */
            'items.*.sale_unit' => [
                'required',
                'string',
                'max:40',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'min:0.001',
            ],

            'items.*.discount' => [
                'required',
                'numeric',
                'min:0',
            ],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (
                Validator $validator,
            ): void {
                $type =
                    $this->input(
                        'settlement_type',
                    );

                $customerId =
                    $this->input(
                        'customer_id',
                    );

                $payments =
                    $this->input(
                        'payments',
                        [],
                    );

                $payments =
                    is_array($payments)
                    ? $payments
                    : [];

                /*
                 * Partial and due sales require a registered customer.
                 */
                if (
                    in_array(
                        $type,
                        [
                            Sale::SETTLEMENT_PARTIAL,
                            Sale::SETTLEMENT_DUE,
                        ],
                        true,
                    )
                    && ! $customerId
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'customer_id',
                            'A registered customer is required for partial or due sales.',
                        );
                }

                /*
                 * Full and partial settlements must contain at least one
                 * payment row. Due settlement intentionally contains none.
                 */
                if (
                    in_array(
                        $type,
                        [
                            Sale::SETTLEMENT_FULL,
                            Sale::SETTLEMENT_PARTIAL,
                        ],
                        true,
                    )
                    && count($payments) === 0
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payments',
                            'Add at least one payment method.',
                        );
                }

                if (
                    $type === Sale::SETTLEMENT_DUE
                    && count($payments) > 0
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payments',
                            'Entire Sale on Due cannot contain an initial payment. Use Partial Payment instead.',
                        );
                }

                /*
                 * Keep each method unique in the same checkout operation.
                 * If the cashier needs two cash amounts, they should be
                 * combined into one Cash line.
                 */
                $paymentMethods = collect(
                    $payments,
                )
                    ->pluck(
                        'payment_method',
                    )
                    ->filter()
                    ->values();

                if (
                    $paymentMethods->count()
                    !== $paymentMethods
                    ->unique()
                    ->count()
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payments',
                            'Use each payment method only once per sale.',
                        );
                }

                /*
                 * Extra item-level validation.
                 */
                $items =
                    $this->input(
                        'items',
                        [],
                    );

                if (! is_array($items)) {
                    return;
                }

                foreach (
                    $items as $index => $item
                ) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $saleUnit =
                        trim(
                            (string) (
                                $item['sale_unit']
                                ?? ''
                            ),
                        );

                    if ($saleUnit === '') {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.sale_unit",
                                'Please select the selling unit.',
                            );
                    }

                    $quantity =
                        (float) (
                            $item['quantity']
                            ?? 0
                        );

                    if ($quantity <= 0) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.quantity",
                                'The sale quantity must be greater than zero.',
                            );
                    }

                    $discount =
                        (float) (
                            $item['discount']
                            ?? 0
                        );

                    if ($discount < 0) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.discount",
                                'The item discount cannot be negative.',
                            );
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' =>
            'Please add at least one product to the sale.',

            'items.min' =>
            'Please add at least one product to the sale.',

            'items.*.stock_batch_id.required' =>
            'Please select a stock batch.',

            'items.*.stock_batch_id.exists' =>
            'The selected stock batch does not exist.',

            'items.*.sale_unit.required' =>
            'Please select whether this item is being sold as Bag, Kg, or its normal unit.',

            'items.*.sale_unit.string' =>
            'The selected selling unit is invalid.',

            'items.*.quantity.required' =>
            'Please enter the quantity.',

            'items.*.quantity.numeric' =>
            'The quantity must be a valid number.',

            'items.*.quantity.min' =>
            'The quantity must be greater than zero.',

            'items.*.discount.numeric' =>
            'The item discount must be a valid amount.',

            'items.*.discount.min' =>
            'The item discount cannot be negative.',

            'settlement_type.required' =>
            'Please select the sale settlement type.',

            'payment_method.in' =>
            'The selected payment method is invalid.',

            'amount_received.required' =>
            'Please enter the received amount.',

            'amount_received.numeric' =>
            'The received amount must be a valid number.',

            'amount_received.min' =>
            'The received amount cannot be negative.',

            'payments.present' =>
            'Payment information is missing.',

            'payments.array' =>
            'Payment information is invalid.',

            'payments.max' =>
            'A sale can use a maximum of four payment methods.',

            'payments.*.payment_method.required' =>
            'Please select the payment method.',

            'payments.*.payment_method.in' =>
            'The selected payment method is invalid.',

            'payments.*.amount.required' =>
            'Please enter the payment amount.',

            'payments.*.amount.numeric' =>
            'The payment amount must be a valid number.',

            'payments.*.amount.min' =>
            'Each payment amount must be greater than zero.',

            'payments.*.reference_number.max' =>
            'The payment reference cannot be longer than 160 characters.',

            'payments.*.notes.max' =>
            'The payment note cannot be longer than 500 characters.',

            'due_date.date_format' =>
            'Please enter a valid due date.',
        ];
    }
}
