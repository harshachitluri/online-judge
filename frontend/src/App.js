import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute, AdminRoute, GuestRoute } from "./components/shell/Guards";
import { PageTransition } from "./components/shell/AppShell";
import { RouteFallback } from "./components/ui";
import TopNav from "./components/shell/TopNav";
import Sidebar from "./components/shell/Sidebar";
import { MODULE } from "./config/brand";

import "./index.css";

/*
 |==========================================================================
 | Routes
 |==========================================================================
 | Every route past the landing page is lazy-loaded, so an anonymous visitor
 | never pays for Monaco, the admin authoring form, or any signed-in-only
 | page. Genesis and Access load eagerly since they're the ~unauthenticated
 | entry points.
 */

const Genesis = lazy(() => import("./pages/Genesis"));

// Access.js and Tracks.js export named members rather than a default, so
// each route gets its own lazy wrapper that re-exports the member as default.
const Enter = lazy(() => import("./pages/Access").then((m) => ({ default: m.Enter })));
const Join = lazy(() => import("./pages/Access").then((m) => ({ default: m.Join })));
const Recover = lazy(() => import("./pages/Access").then((m) => ({ default: m.Recover })));
const ResetPassword = lazy(() => import("./pages/Access").then((m) => ({ default: m.ResetPassword })));

const Deck = lazy(() => import("./pages/Deck"));
const Vault = lazy(() => import("./pages/Vault"));
const Forge = lazy(() => import("./pages/Forge"));
const Pathways = lazy(() => import("./pages/Tracks").then((m) => ({ default: m.Pathways })));
const Constellations = lazy(() => import("./pages/Tracks").then((m) => ({ default: m.Constellations })));
const TopicDetail = lazy(() => import("./pages/TrackDetail").then((m) => ({ default: m.TopicDetail })));
const CompanyDetail = lazy(() => import("./pages/TrackDetail").then((m) => ({ default: m.CompanyDetail })));
const Arena = lazy(() => import("./pages/Arena"));
const Ascendancy = lazy(() => import("./pages/Ascendancy"));
const Telemetry = lazy(() => import("./pages/Telemetry"));
const Nexus = lazy(() => import("./pages/Nexus"));
const SageStudio = lazy(() => import("./pages/SageStudio"));
const Chronicle = lazy(() => import("./pages/Chronicle"));
const Identity = lazy(() => import("./pages/Identity"));
const Signals = lazy(() => import("./pages/Signals"));
const Control = lazy(() => import("./pages/Control"));
const Oracle = lazy(() => import("./pages/Oracle"));
const Architect = lazy(() => import("./pages/Architect"));

/* The anonymous landing page: no Sidebar, just the marketing top bar. */
const MarketingLayout = ({ children }) => (
    <>
        <TopNav />
        {children}
    </>
);

/*
 | The signed-in shell: a persistent left Sidebar owns module navigation,
 | and TopNav is reduced to a slim utility bar (search, theme, notifications,
 | account). Used for every protected and admin route, including the Forge —
 | its own internal layout still fits in the remaining column.
 */
const AppLayout = ({ children }) => (
    <div className="app-shell">
        <Sidebar />
        <div className="app-shell__main">
            <TopNav />
            {children}
        </div>
    </div>
);

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait" initial={false}>
            <Suspense fallback={<RouteFallback />}>
                <Routes location={location} key={location.pathname}>
                    {/* ── Public ────────────────────────────────────── */}
                    <Route
                        path="/"
                        element={
                            <MarketingLayout>
                                <PageTransition>
                                    <Genesis />
                                </PageTransition>
                            </MarketingLayout>
                        }
                    />

                    <Route element={<GuestRoute />}>
                        <Route
                            path="/enter"
                            element={
                                <PageTransition>
                                    <Enter />
                                </PageTransition>
                            }
                        />
                        <Route
                            path="/join"
                            element={
                                <PageTransition>
                                    <Join />
                                </PageTransition>
                            }
                        />
                        <Route
                            path="/recover"
                            element={
                                <PageTransition>
                                    <Recover />
                                </PageTransition>
                            }
                        />
                    </Route>

                    {/*
                     | Not gated by GuestRoute: someone can legitimately open
                     | a reset link while already signed in elsewhere, and
                     | bouncing them to the Dashboard would strand the link.
                     */}
                    <Route
                        path="/reset-password"
                        element={
                            <PageTransition>
                                <ResetPassword />
                            </PageTransition>
                        }
                    />

                    {/* ── Protected ─────────────────────────────────── */}
                    <Route element={<ProtectedRoute />}>
                        <Route
                            path={MODULE.deck.path}
                            element={<AppLayout><PageTransition><Deck /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.vault.path}
                            element={<AppLayout><PageTransition><Vault /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={`${MODULE.forge.path}/:slug`}
                            element={<AppLayout><Forge /></AppLayout>}
                        />
                        <Route
                            path={MODULE.pathways.path}
                            element={<AppLayout><PageTransition><Pathways /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.constellations.path}
                            element={<AppLayout><PageTransition><Constellations /></PageTransition></AppLayout>}
                        />

                        {/* One topic / one company, opened from a card above. */}
                        <Route
                            path={`${MODULE.pathways.path}/:name`}
                            element={<AppLayout><PageTransition><TopicDetail /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={`${MODULE.constellations.path}/:name`}
                            element={<AppLayout><PageTransition><CompanyDetail /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.arena.path}
                            element={<AppLayout><PageTransition><Arena /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.ascendancy.path}
                            element={<AppLayout><PageTransition><Ascendancy /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.telemetry.path}
                            element={<AppLayout><PageTransition><Telemetry /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.nexus.path}
                            element={<AppLayout><PageTransition><Nexus /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.sage.path}
                            element={<AppLayout><PageTransition><SageStudio /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.chronicle.path}
                            element={<AppLayout><PageTransition><Chronicle /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.identity.path}
                            element={<AppLayout><PageTransition><Identity /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.signals.path}
                            element={<AppLayout><PageTransition><Signals /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.control.path}
                            element={<AppLayout><PageTransition><Control /></PageTransition></AppLayout>}
                        />
                        <Route
                            path={MODULE.oracle.path}
                            element={<AppLayout><PageTransition><Oracle /></PageTransition></AppLayout>}
                        />
                    </Route>

                    {/* ── Admin ─────────────────────────────────────── */}
                    <Route element={<AdminRoute />}>
                        <Route
                            path={MODULE.architect.path}
                            element={<AppLayout><PageTransition><Architect /></PageTransition></AppLayout>}
                        />
                    </Route>

                    {/* ── Fallback ──────────────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </AnimatePresence>
    );
};

function App() {
    return (
        // reducedMotion="user" makes every Framer animation respect the OS setting.
        <MotionConfig reducedMotion="user">
            <ThemeProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <AuthProvider>
                            <a href="#main" className="skip-link">Skip to content</a>
                            <AnimatedRoutes />
                        </AuthProvider>
                    </BrowserRouter>
                </ToastProvider>
            </ThemeProvider>
        </MotionConfig>
    );
}

export default App;
