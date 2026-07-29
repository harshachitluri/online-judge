import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute   from "./components/ProtectedRoute";
import AdminRoute       from "./components/AdminRoute";
import Navbar           from "./components/Navbar";

// Public / Standalone
import HomePage         from "./pages/HomePage";
import LoginPage        from "./pages/LoginPage";
import RegisterPage     from "./pages/RegisterPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";

// Layout Pages
import DashboardPage    from "./pages/DashboardPage";
import CurriculumPage   from "./pages/CurriculumPage";
import CompanyBundlesPage from "./pages/CompanyBundlesPage";
import AnalyticsPage    from "./pages/AnalyticsPage";
import ProblemsPage     from "./pages/ProblemsPage";
import SubmissionsPage  from "./pages/SubmissionsPage";
import LeaderboardPage  from "./pages/LeaderboardPage";
import ProfilePage      from "./pages/ProfilePage";

// Admin Pages
import AdminDashboard     from "./pages/admin/AdminDashboard";
import AdminCreateProblem from "./pages/admin/AdminCreateProblem";
import AdminEditProblem   from "./pages/admin/AdminEditProblem";

import PageTransition from "./components/PageTransition";

import "./App.css";

/*
 | Routes are extracted so they can read useLocation() — AnimatePresence keys
 | on the pathname to run the exit animation before the next page mounts.
 */
const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
                {/* Public routes */}
                <Route path="/"         element={<><Navbar /><PageTransition><HomePage /></PageTransition></>} />
                <Route path="/login"    element={<PageTransition><LoginPage /></PageTransition>} />
                <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

                {/* Protected layout routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard"       element={<PageTransition><DashboardPage /></PageTransition>} />
                    <Route path="/curriculum"      element={<PageTransition><CurriculumPage /></PageTransition>} />
                    <Route path="/company-bundles" element={<PageTransition><CompanyBundlesPage /></PageTransition>} />
                    <Route path="/analytics"       element={<PageTransition><AnalyticsPage /></PageTransition>} />
                    <Route path="/problems"        element={<PageTransition><ProblemsPage /></PageTransition>} />
                    <Route path="/problems/:slug"  element={<><Navbar isStandalone /><ProblemDetailPage /></>} />
                    <Route path="/submissions"     element={<PageTransition><SubmissionsPage /></PageTransition>} />
                    <Route path="/leaderboard"     element={<PageTransition><LeaderboardPage /></PageTransition>} />
                    <Route path="/profile"         element={<PageTransition><ProfilePage /></PageTransition>} />
                </Route>

                {/* Admin routes — require admin role */}
                <Route element={<AdminRoute />}>
                    <Route path="/admin/problems"          element={<PageTransition><AdminDashboard /></PageTransition>} />
                    <Route path="/admin/problems/new"      element={<PageTransition><AdminCreateProblem /></PageTransition>} />
                    <Route path="/admin/problems/:id/edit" element={<PageTransition><AdminEditProblem /></PageTransition>} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AnimatePresence>
    );
};

function App() {
    return (
        // reducedMotion="user" makes every animation respect the OS setting
        <MotionConfig reducedMotion="user">
            <ThemeProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <AnimatedRoutes />
                    </BrowserRouter>
                </AuthProvider>
            </ThemeProvider>
        </MotionConfig>
    );
}

export default App;
