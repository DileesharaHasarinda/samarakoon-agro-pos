<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateBusinessSettingRequest;
use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BusinessSettingController
extends Controller
{
    public function show(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $settings =
            BusinessSetting::current();

        $settings->load(
            'updatedBy:id,name,username',
        );

        return response()->json([
            'data' =>
            $this->settingsData(
                $settings,
            ),
        ]);
    }

    public function update(
        UpdateBusinessSettingRequest $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $settings = DB::transaction(
            function () use (
                $request,
                $user,
            ): BusinessSetting {
                $settings =
                    BusinessSetting::query()
                    ->whereKey(1)
                    ->lockForUpdate()
                    ->first();

                if (! $settings) {
                    $settings =
                        BusinessSetting::query()
                        ->create(
                            BusinessSetting
                                ::defaultValues(),
                        );
                }

                $settings->fill(
                    $request->validated(),
                );

                $settings->updated_by =
                    $user->id;

                $settings->save();

                return $settings;
            },
            3,
        );

        $settings->load(
            'updatedBy:id,name,username',
        );

        return response()->json([
            'message' =>
            'Business and printing settings saved successfully.',

            'data' =>
            $this->settingsData(
                $settings,
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsData(
        BusinessSetting $settings,
    ): array {
        return [
            'id' => $settings->id,

            'business_name' =>
            $settings->business_name,

            'business_short_name' =>
            $settings->business_short_name,

            'address' =>
            $settings->address,

            'phone' =>
            $settings->phone,

            'secondary_phone' =>
            $settings->secondary_phone,

            'email' =>
            $settings->email,

            'website' =>
            $settings->website,

            'registration_number' =>
            $settings->registration_number,

            'tax_number' =>
            $settings->tax_number,

            'currency_code' =>
            $settings->currency_code,

            'timezone' =>
            $settings->timezone,

            'logo_data_url' =>
            $settings->logo_data_url,

            'receipt_title' =>
            $settings->receipt_title,

            'receipt_footer' =>
            $settings->receipt_footer,

            'invoice_title' =>
            $settings->invoice_title,

            'invoice_footer' =>
            $settings->invoice_footer,

            'receipt_paper_size' =>
            $settings->receipt_paper_size,

            'default_print_document' =>
            $settings->default_print_document,

            'receipt_copies' =>
            (int) $settings
                ->receipt_copies,

            'printer_name' =>
            $settings->printer_name,

            'show_logo_on_receipt' =>
            (bool) $settings
                ->show_logo_on_receipt,

            'show_business_address' =>
            (bool) $settings
                ->show_business_address,

            'show_customer_details' =>
            (bool) $settings
                ->show_customer_details,

            'show_cashier_name' =>
            (bool) $settings
                ->show_cashier_name,

            'show_payment_reference' =>
            (bool) $settings
                ->show_payment_reference,

            'show_due_date' =>
            (bool) $settings
                ->show_due_date,

            'show_sku' =>
            (bool) $settings
                ->show_sku,

            'show_batch_number' =>
            (bool) $settings
                ->show_batch_number,

            'auto_print_after_sale' =>
            (bool) $settings
                ->auto_print_after_sale,

            'print_duplicate_label' =>
            (bool) $settings
                ->print_duplicate_label,

            'updated_at' =>
            $settings
                ->updated_at
                ?->toISOString(),

            'updated_by' =>
            $settings->updatedBy
                ? [
                    'id' =>
                    $settings
                        ->updatedBy
                        ->id,

                    'name' =>
                    $settings
                        ->updatedBy
                        ->name,

                    'username' =>
                    $settings
                        ->updatedBy
                        ->username,
                ]
                : null,
        ];
    }
}
