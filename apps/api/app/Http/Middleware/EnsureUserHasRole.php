<?php

namespace App\Http\Middleware;

use Closure;
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

        if ($user === null) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $allowedRoles = array_map(
            static fn(string $role): string => strtolower($role),
            $allowedRoles,
        );

        if (
            ! in_array(
                $user->role,
                $allowedRoles,
                true,
            )
        ) {
            return response()->json([
                'message' => 'You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
