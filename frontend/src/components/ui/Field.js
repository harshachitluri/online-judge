import React, { forwardRef, useId, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuEye, LuEyeOff, LuTriangleAlert } from "react-icons/lu";

/*
 |==========================================================================
 | Form fields
 |==========================================================================
 | Every field wires its own label, hint and error together with real ids
 | and aria-describedby, so an error is announced rather than merely being
 | red. A red border alone is invisible to a screen reader and ambiguous to
 | anyone with a red-green deficiency.
 */

/**
 * The label / hint / error frame. Renders any control as its child via a
 * function so the control receives the generated ids.
 */
export const Field = ({
    label,
    hint,
    error,
    required,
    optionalNote,
    className = "",
    children
}) => {
    const uid = useId();
    const controlId = `${uid}-control`;
    const hintId = `${uid}-hint`;
    const errorId = `${uid}-error`;

    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

    return (
        <div className={`field ${className}`}>
            {label && (
                <label className="field__label" htmlFor={controlId}>
                    <span>
                        {label}
                        {required && (
                            <span className="field__required" aria-hidden="true"> *</span>
                        )}
                    </span>
                    {optionalNote && <span className="text-faint">{optionalNote}</span>}
                </label>
            )}

            {typeof children === "function"
                ? children({
                      id: controlId,
                      "aria-describedby": describedBy,
                      "aria-invalid": error ? "true" : undefined,
                      "aria-required": required || undefined
                  })
                : children}

            {hint && !error && (
                <span className="field__hint" id={hintId}>
                    {hint}
                </span>
            )}

            <AnimatePresence initial={false}>
                {error && (
                    <motion.span
                        className="field__error"
                        id={errorId}
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                    >
                        <LuTriangleAlert size={13} aria-hidden="true" />
                        {error}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ── Input ─────────────────────────────────────────────────────────────── */

export const Input = forwardRef(function Input(
    { leadingIcon: Lead, trailing, className = "", ...rest },
    ref
) {
    const classes = [
        "input",
        Lead && "input--with-lead",
        trailing && "input--with-trail",
        className
    ]
        .filter(Boolean)
        .join(" ");

    if (!Lead && !trailing) {
        return <input ref={ref} className={classes} {...rest} />;
    }

    return (
        <div className="input-wrap">
            {Lead && (
                <span className="input__lead" aria-hidden="true">
                    <Lead size={16} />
                </span>
            )}
            <input ref={ref} className={classes} {...rest} />
            {trailing && (
                <span className="input__trail input__trail--action">{trailing}</span>
            )}
        </div>
    );
});

export const TextArea = forwardRef(function TextArea({ className = "", ...rest }, ref) {
    return <textarea ref={ref} className={`input ${className}`} {...rest} />;
});

export const Select = forwardRef(function Select(
    { options = [], placeholder, className = "", children, ...rest },
    ref
) {
    return (
        <select ref={ref} className={`input ${className}`} {...rest}>
            {placeholder && (
                <option value="" disabled={rest.required}>
                    {placeholder}
                </option>
            )}
            {children ||
                options.map((opt) => {
                    const value = typeof opt === "string" ? opt : opt.value;
                    const label = typeof opt === "string" ? opt : opt.label;
                    return (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    );
                })}
        </select>
    );
});

/* ── Password ──────────────────────────────────────────────────────────── */

/**
 * A password input with a reveal toggle.
 *
 * The toggle is a real button with an aria-label that describes the *action*
 * ("Show password") rather than the state, and it never becomes a tab stop
 * trap because it sits after the input in DOM order.
 */
export const PasswordInput = forwardRef(function PasswordInput(
    { className = "", ...rest },
    ref
) {
    const [visible, setVisible] = useState(false);

    return (
        <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className={className}
            autoComplete={rest.autoComplete || "current-password"}
            trailing={
                <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    // Toggling reveal should never submit the surrounding form.
                    tabIndex={0}
                >
                    {visible ? <LuEyeOff size={15} /> : <LuEye size={15} />}
                </button>
            }
            {...rest}
        />
    );
});

/* ── Password strength ─────────────────────────────────────────────────── */

const LEVELS = [
    { label: "Too short",  color: "var(--status-critical)" },
    { label: "Weak",       color: "var(--status-critical)" },
    { label: "Fair",       color: "var(--status-warning)" },
    { label: "Strong",     color: "var(--status-info)" },
    { label: "Excellent",  color: "var(--status-good)" }
];

/**
 * Scores a password 0–4 on length and character variety.
 *
 * This is a *hint*, not a security control — the backend enforces the real
 * minimum. It exists to nudge people away from "password1", so it weights
 * length heavily, which is what actually matters.
 */
export const scorePassword = (password = "") => {
    if (!password) return { score: 0, checks: {} };

    const checks = {
        length: password.length >= 8,
        long: password.length >= 12,
        lower: /[a-z]/.test(password),
        upper: /[A-Z]/.test(password),
        digit: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password)
    };

    if (password.length < 6) return { score: 0, checks };

    let score = 1;
    const variety = [checks.lower, checks.upper, checks.digit, checks.symbol].filter(Boolean).length;

    if (checks.length && variety >= 2) score = 2;
    if (checks.length && variety >= 3) score = 3;
    if (checks.long && variety >= 3) score = 4;

    // A long passphrase of pure lowercase is genuinely strong; don't punish it.
    if (password.length >= 16 && variety >= 2) score = 4;

    return { score, checks };
};

/**
 * The strength meter. Strength is encoded three ways — how many segments
 * fill, what colour they are, and the text label — so it is legible without
 * colour perception.
 */
export const StrengthMeter = ({ password = "" }) => {
    const { score } = useMemo(() => scorePassword(password), [password]);
    const level = LEVELS[score];

    return (
        <div className="strength">
            <div
                className="strength__bars"
                role="meter"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label={`Password strength: ${level.label}`}
            >
                {[0, 1, 2, 3].map((i) => (
                    <motion.span
                        key={i}
                        className="strength__bar"
                        animate={{
                            backgroundColor: i < score ? level.color : "var(--surface-3)"
                        }}
                        transition={{ duration: 0.28 }}
                    />
                ))}
            </div>

            <div className="strength__meta">
                <span style={{ color: password ? level.color : undefined }}>
                    {password ? level.label : "Use 8+ characters"}
                </span>
                <span>{password.length} characters</span>
            </div>
        </div>
    );
};

/* ── Switch ────────────────────────────────────────────────────────────── */

export const Switch = ({ checked, onChange, label, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className="switch"
        onClick={() => onChange?.(!checked)}
        style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
    >
        <span className="switch__thumb" />
    </button>
);

/** Switch + label + description, as used throughout the Control Room. */
export const SwitchRow = ({ label, description, checked, onChange, disabled }) => (
    <div className="row row-between" style={{ gap: "var(--sp-6)" }}>
        <div className="stack stack-1" style={{ minWidth: 0 }}>
            <span style={{ fontWeight: "var(--fw-medium)" }}>{label}</span>
            {description && (
                <span className="field__hint">{description}</span>
            )}
        </div>
        <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
);
