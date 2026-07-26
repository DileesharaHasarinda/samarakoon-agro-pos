<?php

namespace App\Http\Middleware;

use App\Models\CashierShift;
use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOpenCashierShift
{
    /**
     * @param Closure(Request): Response $next
     */
    public function handle(
        Request $request,
        Closure $next,
    ): Response {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return new JsonResponse([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        /*
         * Admin users may complete transactions
         * without opening a cashier shift.
         */
        if ($user->isAdmin()) {
            return $next($request);
        }

        if (! $user->isCashier()) {
            return new JsonResponse([
                'message' =>
                'Cashier access is required.',
            ], 403);
        }

        $hasOpenShift =
            CashierShift::query()
            ->where(
                'cashier_id',
                $user->id,
            )
            ->where(
                'status',
                CashierShift::STATUS_OPEN,
            )
            ->exists();

        if (! $hasOpenShift) {
            return new JsonResponse([
                'message' =>
                'Open your cashier shift before completing sales, due payments or returns.',
            ], 422);
        }

        return $next($request);
    }
}
