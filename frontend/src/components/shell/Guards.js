import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { RouteFallback, EmptyState, Button } from "../ui";
import { LuShieldAlert } from "react-icons/lu";
import { MODULE } from "../../config/brand";

/*
 |==========================================================================
 | Route guards
 |==========================================================================
 | Both guards wait for the session probe to resolve before deciding.
 | Treating "still checking" as "signed out" is what causes the sign-in page
 | to flash on every hard refresh of a protected route.
 */

export const ProtectedRoute = () => {
    const { resolving, isAuthenticated } = useAuth();
    const location = useLocation();

    if (resolving) return <RouteFallback label="Verifying your session" />;

    if (!isAuthenticated) {
        // Carry the intended destination so sign-in can return them to it.
        const from = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/enter?from=${from}`} replace />;
    }

    return <Outlet />;
};

export const AdminRoute = () => {
    const { resolving, isAuthenticated, isAdmin } = useAuth();
    const location = useLocation();

    if (resolving) return <RouteFallback label="Checking permissions" />;

    if (!isAuthenticated) {
        const from = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/enter?from=${from}`} replace />;
    }

    /*
     | A signed-in non-admin gets an explanation rather than a redirect.
     | Bouncing them silently to the dashboard reads as a bug — they clicked
     | something and apparently nothing happened.
     */
    if (!isAdmin) {
        return (
            <main className="page shell">
                <EmptyState
                    icon={LuShieldAlert}
                    title="Admin access required"
                    body="This area is limited to accounts with authoring permissions. If you believe you should have access, ask an existing admin to grant it."
                    action={
                        <Button variant="secondary" to={MODULE.deck.path}>
                            Back to the Dashboard
                        </Button>
                    }
                />
            </main>
        );
    }

    return <Outlet />;
};

/**
 * The inverse guard: keeps a signed-in user off the sign-in and join pages,
 * which would otherwise let them create a second session over the first.
 */
export const GuestRoute = () => {
    const { resolving, isAuthenticated } = useAuth();

    if (resolving) return <RouteFallback />;
    if (isAuthenticated) return <Navigate to={MODULE.deck.path} replace />;

    return <Outlet />;
};
