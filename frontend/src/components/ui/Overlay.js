import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuX } from "react-icons/lu";

import Button from "./Button";
import { overlayVariants, modalVariants } from "../../lib/motion";
import { useScrollLock, useFocusTrap } from "../../hooks";

/*
 |==========================================================================
 | Modal
 |==========================================================================
 | Portalled to <body> so it escapes any transformed or overflow-hidden
 | ancestor — a modal rendered inside a card with `overflow: hidden` clips,
 | and inside a `transform` it stops being fixed-positioned at all.
 |
 | Accessibility: role="dialog" + aria-modal, focus trapped while open,
 | focus restored on close, Escape closes, and the backdrop click is
 | opt-out-able for destructive flows where an accidental click shouldn't
 | discard work.
 */

export const Modal = ({
    open,
    onClose,
    title,
    description,
    footer,
    wide = false,
    dismissOnBackdrop = true,
    children
}) => {
    const panelRef = useRef(null);

    useScrollLock(open);
    useFocusTrap(panelRef, open);

    useEffect(() => {
        if (!open) return undefined;

        const onKey = (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onClose?.();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="overlay"
                    variants={overlayVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    onMouseDown={(event) => {
                        // Only a press that *starts* on the backdrop counts —
                        // otherwise a text selection that drags out of the
                        // panel closes the dialog.
                        if (dismissOnBackdrop && event.target === event.currentTarget) {
                            onClose?.();
                        }
                    }}
                >
                    <motion.div
                        ref={panelRef}
                        className={`modal ${wide ? "modal--wide" : ""}`}
                        variants={modalVariants}
                        role="dialog"
                        aria-modal="true"
                        aria-label={typeof title === "string" ? title : undefined}
                        tabIndex={-1}
                    >
                        {title && (
                            <div className="modal__head">
                                <div className="stack stack-1">
                                    <h2 style={{ fontSize: "var(--fs-lg)" }}>{title}</h2>
                                    {description && (
                                        <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                                            {description}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    iconOnly
                                    icon={LuX}
                                    onClick={onClose}
                                    aria-label="Close dialog"
                                />
                            </div>
                        )}

                        <div className="modal__body">{children}</div>

                        {footer && <div className="modal__foot">{footer}</div>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

/*
 |--------------------------------------------------------------------------
 | ConfirmDialog
 |--------------------------------------------------------------------------
 | For irreversible actions. The backdrop is deliberately *not* dismissable
 | and the destructive button is never the one focus lands on first.
 */

export const ConfirmDialog = ({
    open,
    onClose,
    onConfirm,
    title = "Are you sure?",
    body,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "danger",
    loading = false
}) => (
    <Modal
        open={open}
        onClose={loading ? undefined : onClose}
        title={title}
        dismissOnBackdrop={false}
        footer={
            <>
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                    {cancelLabel}
                </Button>
                <Button variant={tone} onClick={onConfirm} loading={loading}>
                    {confirmLabel}
                </Button>
            </>
        }
    >
        <p className="text-secondary" style={{ fontSize: "var(--fs-sm)" }}>
            {body}
        </p>
    </Modal>
);

/*
 |--------------------------------------------------------------------------
 | Drawer
 |--------------------------------------------------------------------------
 | The mobile counterpart to a modal — slides from the edge and takes the
 | full height. Used for the mobile navigation and the Forge's side panels.
 */

export const Drawer = ({ open, onClose, side = "right", width = 360, title, children }) => {
    const panelRef = useRef(null);

    useScrollLock(open);
    useFocusTrap(panelRef, open);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (typeof document === "undefined") return null;

    const offscreen = side === "right" ? "100%" : "-100%";

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="overlay"
                    style={{ padding: 0, placeItems: "stretch" }}
                    variants={overlayVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
                >
                    <motion.aside
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        tabIndex={-1}
                        className="drawer"
                        style={{
                            width: `min(${width}px, 92vw)`,
                            marginLeft: side === "right" ? "auto" : 0
                        }}
                        initial={{ x: offscreen }}
                        animate={{ x: 0 }}
                        exit={{ x: offscreen }}
                        transition={{ type: "spring", stiffness: 380, damping: 40 }}
                    >
                        <div className="drawer__head">
                            <h2 style={{ fontSize: "var(--fs-base)" }}>{title}</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={LuX}
                                onClick={onClose}
                                aria-label="Close"
                            />
                        </div>

                        <div className="drawer__body">{children}</div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
