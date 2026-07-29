import React, {
    createContext, useContext, useState, useCallback, useMemo, useRef, useEffect
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    LuCircleCheck, LuCircleX, LuTriangleAlert, LuInfo, LuX
} from "react-icons/lu";

import { toastVariants } from "../lib/motion";

/*
 |==========================================================================
 | ToastContext
 |==========================================================================
 | Transient feedback. Every toast carries an icon *and* a text message —
 | the tone colour is a reinforcement, never the only signal.
 |
 | The region is aria-live so screen readers announce results without the
 | user having to go looking for them. Errors use `assertive`; everything
 | else is polite so it doesn't interrupt.
 */

const ToastContext = createContext(null);

const ICONS = {
    good: LuCircleCheck,
    critical: LuCircleX,
    warning: LuTriangleAlert,
    info: LuInfo
};

const DEFAULT_DURATION = 4200;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));

        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);

    const push = useCallback(
        ({ tone = "info", title, body, duration = DEFAULT_DURATION }) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            setToasts((prev) => {
                // Cap the stack: past four, the oldest is unreadable anyway.
                const next = [...prev, { id, tone, title, body }];
                return next.slice(-4);
            });

            if (duration > 0) {
                timers.current.set(id, setTimeout(() => dismiss(id), duration));
            }

            return id;
        },
        [dismiss]
    );

    // Clear every pending timer on unmount so a dismissed toast can't fire
    // setState after the provider is gone.
    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    const value = useMemo(
        () => ({
            push,
            dismiss,
            success: (title, body) => push({ tone: "good", title, body }),
            error: (title, body) => push({ tone: "critical", title, body, duration: 6000 }),
            warn: (title, body) => push({ tone: "warning", title, body }),
            info: (title, body) => push({ tone: "info", title, body })
        }),
        [push, dismiss]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="toaster" role="region" aria-label="Notifications">
                <AnimatePresence initial={false}>
                    {toasts.map((toast) => {
                        const Icon = ICONS[toast.tone] || LuInfo;

                        return (
                            <motion.div
                                key={toast.id}
                                layout
                                className={`toast toast--${toast.tone}`}
                                variants={toastVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                role={toast.tone === "critical" ? "alert" : "status"}
                                aria-live={toast.tone === "critical" ? "assertive" : "polite"}
                            >
                                <span className="toast__icon" aria-hidden="true">
                                    <Icon />
                                </span>

                                <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                                    <span className="toast__title">{toast.title}</span>
                                    {toast.body && <span className="toast__body">{toast.body}</span>}
                                </div>

                                <button
                                    type="button"
                                    className="btn btn--ghost btn--icon btn--xs"
                                    onClick={() => dismiss(toast.id)}
                                    aria-label="Dismiss notification"
                                >
                                    <LuX />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used inside a ToastProvider.");
    return context;
};

export default ToastContext;
