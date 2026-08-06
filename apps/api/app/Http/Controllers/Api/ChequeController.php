<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cheque\StoreChequeRequest;
use App\Http\Requests\Cheque\UpdateChequeRequest;
use App\Http\Requests\Cheque\UpdateChequeStatusRequest;
use App\Models\Cheque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChequeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = Cheque::query()
            ->with('createdBy:id,name,username')
            ->when(
                $request->filled('search'),
                fn($q) => $q->where(function ($inner) use ($request) {
                    $search = (string) $request->string('search');

                    $inner->where('cheque_number', 'like', "%{$search}%")
                        ->orWhere('party_name', 'like', "%{$search}%")
                        ->orWhere('bank_name', 'like', "%{$search}%");
                }),
            )
            ->when(
                $request->filled('type'),
                fn($q) => $q->where('type', $request->string('type')),
            )
            ->when(
                $request->filled('status'),
                fn($q) => $q->where('status', $request->string('status')),
            )
            ->orderByDesc('due_date');

        $cheques = $query->paginate($perPage);

        return response()->json([
            'data' => $cheques->items(),
            'meta' => [
                'current_page' => $cheques->currentPage(),
                'last_page' => $cheques->lastPage(),
                'per_page' => $cheques->perPage(),
                'total' => $cheques->total(),
                'from' => $cheques->firstItem(),
                'to' => $cheques->lastItem(),
            ],
            'summary' => $this->buildSummary(),
        ]);
    }

    public function store(StoreChequeRequest $request): JsonResponse
    {
        $cheque = Cheque::create([
            ...$request->validated(),
            'status' => Cheque::STATUS_PENDING,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $cheque->fresh(['createdBy:id,name,username']),
            'message' => 'Cheque recorded successfully.',
        ], 201);
    }

    public function show(Cheque $cheque): JsonResponse
    {
        return response()->json([
            'data' => $cheque->load('createdBy:id,name,username'),
        ]);
    }

    public function update(UpdateChequeRequest $request, Cheque $cheque): JsonResponse
    {
        $cheque->update($request->validated());

        return response()->json([
            'data' => $cheque->fresh(['createdBy:id,name,username']),
            'message' => 'Cheque updated successfully.',
        ]);
    }

    public function updateStatus(UpdateChequeStatusRequest $request, Cheque $cheque): JsonResponse
    {
        $status = $request->string('status')->toString();

        $cheque->status = $status;

        $cheque->cleared_at = $status === Cheque::STATUS_CLEARED ? now() : null;
        $cheque->bounced_at = $status === Cheque::STATUS_BOUNCED ? now() : null;

        $cheque->save();

        return response()->json([
            'data' => $cheque->fresh(['createdBy:id,name,username']),
            'message' => 'Cheque status updated successfully.',
        ]);
    }

    public function destroy(Cheque $cheque): JsonResponse
    {
        if ($cheque->status !== Cheque::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending cheques can be deleted.',
            ], 422);
        }

        $cheque->delete();

        return response()->json([
            'message' => 'Cheque deleted successfully.',
        ]);
    }

    /**
     * Lightweight alert summary for the dashboard notification.
     */
    public function alerts(): JsonResponse
    {
        $dueSoon = Cheque::query()
            ->dueSoon(3)
            ->with('createdBy:id,name,username')
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        $overdue = Cheque::query()
            ->overdue()
            ->with('createdBy:id,name,username')
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        $bounced = Cheque::query()
            ->bounced()
            ->with('createdBy:id,name,username')
            ->orderByDesc('bounced_at')
            ->limit(10)
            ->get();

        return response()->json([
            'due_soon_count' => $dueSoon->count(),
            'overdue_count' => $overdue->count(),
            'bounced_count' => $bounced->count(),
            'total_alerts' => $dueSoon->count() + $overdue->count() + $bounced->count(),
            'due_soon' => $dueSoon,
            'overdue' => $overdue,
            'bounced' => $bounced,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSummary(): array
    {
        return [
            'total_cheques' => Cheque::query()->count(),
            'pending_count' => Cheque::query()->pending()->count(),
            'pending_amount' => (float) Cheque::query()->pending()->sum('amount'),
            'bounced_count' => Cheque::query()->bounced()->count(),
            'due_soon_count' => Cheque::query()->dueSoon(3)->count(),
            'overdue_count' => Cheque::query()->overdue()->count(),
        ];
    }
}
