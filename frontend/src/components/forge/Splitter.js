import React, { useRef, useCallback, useState, useEffect } from "react";

/*
 |==========================================================================
 | Splitter
 |==========================================================================
 | A two-pane resizable split. Written by hand rather than pulled in as a
 | dependency because the requirements are small and specific: it has to
 | honour a design-system grab handle, be keyboard-operable, and clamp to
 | percentages so the layout survives a window resize.
 |
 | The drag writes to a CSS custom property on the container rather than to
 | React state on every pointermove — a state update per frame would
 | re-render the Monaco editor sixty times a second.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const Splitter = ({
    direction = "horizontal",   // horizontal = side-by-side, vertical = stacked
    initial = 50,               // first pane size, percent
    min = 20,
    max = 80,
    storageKey,
    disabled = false,
    first,
    second,
    className = ""
}) => {
    const containerRef = useRef(null);
    const draggingRef = useRef(false);

    const [size, setSize] = useState(() => {
        if (!storageKey) return initial;
        try {
            const stored = Number(localStorage.getItem(storageKey));
            return Number.isFinite(stored) && stored >= min && stored <= max ? stored : initial;
        } catch {
            return initial;
        }
    });

    const isHorizontal = direction === "horizontal";

    /* Commit the final size to state (and storage) only when the drag ends. */
    const commit = useCallback(
        (value) => {
            setSize(value);
            if (!storageKey) return;
            try {
                localStorage.setItem(storageKey, String(value));
            } catch { /* private mode — the split just won't persist */ }
        },
        [storageKey]
    );

    const onPointerDown = (event) => {
        if (disabled) return;

        event.preventDefault();
        draggingRef.current = true;

        const container = containerRef.current;
        // Pointer capture keeps events coming even when the cursor crosses
        // the Monaco iframe-like surface, which otherwise swallows them.
        event.currentTarget.setPointerCapture(event.pointerId);

        container.dataset.dragging = "true";
        document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
    };

    const onPointerMove = (event) => {
        if (!draggingRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        const ratio = isHorizontal
            ? ((event.clientX - rect.left) / rect.width) * 100
            : ((event.clientY - rect.top) / rect.height) * 100;

        const next = clamp(ratio, min, max);

        // Direct style write — no re-render, so Monaco stays smooth.
        container.style.setProperty("--split", `${next}%`);
    };

    const onPointerUp = (event) => {
        if (!draggingRef.current) return;

        draggingRef.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);

        const container = containerRef.current;
        delete container.dataset.dragging;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        const current = parseFloat(container.style.getPropertyValue("--split"));
        if (Number.isFinite(current)) commit(current);
    };

    /* Keyboard: arrows nudge, Home/End jump to the clamps. */
    const onKeyDown = (event) => {
        const step = event.shiftKey ? 10 : 2;
        let next = size;

        const decrease = isHorizontal ? "ArrowLeft" : "ArrowUp";
        const increase = isHorizontal ? "ArrowRight" : "ArrowDown";

        if (event.key === decrease) next = clamp(size - step, min, max);
        else if (event.key === increase) next = clamp(size + step, min, max);
        else if (event.key === "Home") next = min;
        else if (event.key === "End") next = max;
        else if (event.key === "Enter") next = initial;
        else return;

        event.preventDefault();
        containerRef.current.style.setProperty("--split", `${next}%`);
        commit(next);
    };

    // Keep the custom property in step when `size` changes from outside a
    // drag (keyboard, reset, first mount).
    useEffect(() => {
        containerRef.current?.style.setProperty("--split", `${size}%`);
    }, [size]);

    return (
        <div
            ref={containerRef}
            className={`splitter splitter--${direction} ${disabled ? "splitter--stacked" : ""} ${className}`}
        >
            <div className="splitter__pane splitter__pane--first">{first}</div>

            {!disabled && (
                <div
                    className="splitter__handle"
                    role="separator"
                    tabIndex={0}
                    aria-orientation={isHorizontal ? "vertical" : "horizontal"}
                    aria-valuenow={Math.round(size)}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-label={`Resize panes — currently ${Math.round(size)}%`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={onKeyDown}
                    onDoubleClick={() => commit(initial)}
                >
                    <span className="splitter__grip" aria-hidden="true" />
                </div>
            )}

            <div className="splitter__pane splitter__pane--second">{second}</div>
        </div>
    );
};

export default Splitter;
