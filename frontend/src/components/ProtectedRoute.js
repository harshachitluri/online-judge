import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Uses React Router v6's Outlet pattern.
 *
 * - If auth state is still loading from localStorage → show spinner
 * - If unauthenticated → redirect to /login
 * - If authenticated → render child routes via <Outlet />
 */
const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return <Loader fullPage />;

    return isAuthenticated
        ? <Outlet />
        : <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
};

export default ProtectedRoute;
