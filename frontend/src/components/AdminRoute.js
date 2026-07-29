import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/**
 * AdminRoute — wraps routes that require admin authentication.
 */
const AdminRoute = () => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) return <Loader fullPage />;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
    }

    if (user?.role !== "admin") {
        return <Navigate to="/problems" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
