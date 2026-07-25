<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(
        Request $request,
        Closure $next,
        string ...$allowedRoles,
    ): Response {
        $user = $request->user();

        if (! $user instanceof User) {
            return new JsonResponse([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (
            ! in_array(
                $user->role,
                $allowedRoles,
                true,
            )
        ) {
            return new JsonResponse([
                'message' => 'You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
