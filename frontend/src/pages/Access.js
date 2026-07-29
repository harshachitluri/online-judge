import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";
import { FcGoogle } from "react-icons/fc";

import { BRAND, MODULE } from "../config/brand";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../api/client";
import client from "../api/client";
import {
    Button, Card, Field, Input, PasswordInput, StrengthMeter, scorePassword
} from "../components/ui";
import { Aurora } from "../components/shell/AppShell";
import Logo, { Mark } from "../components/shell/Logo";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Access — sign in, join, recover
 |==========================================================================
 | All three flows share one chunk: a visitor who lands on one of them is
 | very likely to visit another, so splitting them further would just add
 | round-trips.
 */

/* ── Google ────────────────────────────────────────────────────────────── */

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

/*
 | Google Identity Services is loaded on demand rather than in index.html —
 | there is no reason for a signed-in user opening the Command Deck to pay
 | for a third-party script they will never use.
 |
 | The promise is cached at module scope so two mounted buttons share one
 | script tag.
 */
let gsiPromise = null;

const loadGoogleScript = () => {
    if (gsiPromise) return gsiPromise;

    gsiPromise = new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve(window.google);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google);
        script.onerror = () => {
            // Allow a later attempt to retry rather than caching the failure.
            gsiPromise = null;
            reject(new Error("Could not load Google sign-in."));
        };

        document.head.appendChild(script);
    });

    return gsiPromise;
};

/**
 * The Google button.
 *
 * Renders Google's own button (required by their branding terms) into a
 * container we own, and reports the credential upward. When no client id is
 * configured it renders an explicit disabled state rather than a button
 * that silently does nothing.
 */
const GoogleButton = ({ onCredential, disabled }) => {
    const containerRef = useRef(null);
    const [state, setState] = useState(GOOGLE_CLIENT_ID ? "loading" : "unconfigured");

    const onCredentialRef = useRef(onCredential);
    onCredentialRef.current = onCredential;

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return undefined;

        let cancelled = false;

        loadGoogleScript()
            .then((google) => {
                if (cancelled || !containerRef.current) return;

                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response) => onCredentialRef.current?.(response.credential)
                });

                google.accounts.id.renderButton(containerRef.current, {
                    theme: "outline",
                    size: "large",
                    width: containerRef.current.offsetWidth || 360,
                    text: "continue_with",
                    shape: "rectangular",
                    logo_alignment: "center"
                });

                setState("ready");
            })
            .catch(() => !cancelled && setState("failed"));

        return () => {
            cancelled = true;
        };
    }, []);

    if (state === "unconfigured") {
        return (
            <div className="google-fallback">
                <FcGoogle size={17} aria-hidden="true" />
                <span>
                    Google sign-in isn't configured on this deployment.
                    <span className="text-faint"> Set REACT_APP_GOOGLE_CLIENT_ID to enable it.</span>
                </span>
            </div>
        );
    }

    if (state === "failed") {
        return (
            <div className="google-fallback">
                <Icons.LuTriangleAlert size={16} style={{ color: "var(--status-warning)" }} aria-hidden="true" />
                <span>Google sign-in couldn't load. Use your email and password below.</span>
            </div>
        );
    }

    return (
        <div className="google-slot" data-disabled={disabled || undefined}>
            {state === "loading" && (
                <div className="google-fallback">
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Preparing Google sign-in…</span>
                </div>
            )}
            <div ref={containerRef} style={{ colorScheme: "light" }} />
        </div>
    );
};

/* ── Shared frame ──────────────────────────────────────────────────────── */

/*
 | A two-column frame: the form on the left, an editorial panel on the
 | right that gives the page some weight without competing with the form.
 | The panel is hidden below 940px — on a phone, a login form should be a
 | login form.
 */
const AccessFrame = ({ eyebrow, title, description, aside, children, footer }) => (
    <div className="access">
        <Aurora grid />

        <div className="access__bar">
            <Logo />
            <Button variant="ghost" size="sm" to="/" icon={Icons.LuArrowLeft}>
                Back to site
            </Button>
        </div>

        <div className="access__grid">
            <motion.div
                className="access__form"
                variants={staggerParent(0.07)}
                initial="initial"
                animate="animate"
            >
                <motion.div className="stack stack-2" variants={riseChild}>
                    <span className="eyebrow">{eyebrow}</span>
                    <h1 className="access__title">{title}</h1>
                    <p className="access__desc">{description}</p>
                </motion.div>

                <motion.div variants={riseChild}>{children}</motion.div>

                {footer && (
                    <motion.div className="access__footer" variants={riseChild}>
                        {footer}
                    </motion.div>
                )}
            </motion.div>

            <aside className="access__aside" aria-hidden="true">
                {aside}
            </aside>
        </div>
    </div>
);

/* The editorial panel. Purely decorative, hence aria-hidden on the wrapper. */
const AsidePanel = ({ points }) => (
    <div className="access-panel">
        <Mark size={38} animated />

        <h2 className="access-panel__title">{BRAND.tagline}</h2>

        <ul className="access-panel__list">
            {points.map((point) => {
                const Icon = Icons[point.icon] || Icons.LuCheck;
                return (
                    <li key={point.text}>
                        <span className="access-panel__icon">
                            <Icon size={15} />
                        </span>
                        <span>{point.text}</span>
                    </li>
                );
            })}
        </ul>

        <div className="access-panel__glow" />
    </div>
);

/* ── Validation ────────────────────────────────────────────────────────── */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validators = {
    username: (value) => {
        if (!value.trim()) return "Choose a handle.";
        if (value.trim().length < 3) return "At least 3 characters.";
        if (value.trim().length > 32) return "Keep it under 32 characters.";
        return null;
    },
    email: (value) => {
        if (!value.trim()) return "Enter your email.";
        if (!EMAIL_PATTERN.test(value.trim())) return "That doesn't look like an email address.";
        return null;
    },
    // Mirrors the backend's MIN_PASSWORD_LENGTH. Client validation is a
    // courtesy; the server is what actually enforces this.
    password: (value) => {
        if (!value) return "Enter a password.";
        if (value.length < 6) return "At least 6 characters.";
        return null;
    }
};

/** Small form controller: values, touched, errors, submit gating. */
const useForm = (initial, rules) => {
    const [values, setValues] = useState(initial);
    const [touched, setTouched] = useState({});
    const [serverError, setServerError] = useState(null);

    const errors = useMemo(() => {
        const out = {};
        Object.entries(rules).forEach(([key, rule]) => {
            const error = rule(values[key] ?? "", values);
            if (error) out[key] = error;
        });
        return out;
    }, [values, rules]);

    const set = (key) => (event) => {
        const value = event?.target ? event.target.value : event;
        setValues((prev) => ({ ...prev, [key]: value }));
        // Any edit clears the server error — it refers to the previous
        // attempt and is misleading once the input changes.
        setServerError(null);
    };

    const blur = (key) => () => setTouched((prev) => ({ ...prev, [key]: true }));

    /** Only show an error once the field has been visited. */
    const errorFor = (key) => (touched[key] ? errors[key] : undefined);

    const touchAll = () =>
        setTouched(Object.fromEntries(Object.keys(rules).map((k) => [k, true])));

    return {
        values, errors, set, blur, errorFor, touchAll,
        isValid: Object.keys(errors).length === 0,
        serverError, setServerError
    };
};

/* An inline alert for whatever the server said. */
const ServerError = ({ message }) => (
    <AnimatePresence>
        {message && (
            <motion.div
                className="access__alert"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
            >
                <Icons.LuTriangleAlert size={15} aria-hidden="true" />
                <span>{message}</span>
            </motion.div>
        )}
    </AnimatePresence>
);

/*
 |==========================================================================
 | Enter — sign in
 |==========================================================================
 */

export const Enter = () => {
    const { login, loginWithGoogle } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const [submitting, setSubmitting] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);

    // Where the guard sent them from, so sign-in returns them there.
    const destination = params.get("from") || MODULE.deck.path;

    const form = useForm(
        { email: "", password: "" },
        { email: validators.email, password: validators.password }
    );

    const onSubmit = async (event) => {
        event.preventDefault();
        form.touchAll();
        if (!form.isValid) return;

        setSubmitting(true);
        try {
            const user = await login({
                email: form.values.email.trim(),
                password: form.values.password
            });

            toast.success(`Welcome back, ${user.username}`, "Session established.");
            navigate(destination, { replace: true });
        } catch (error) {
            form.setServerError(errorMessage(error, "Could not sign you in."));
        } finally {
            setSubmitting(false);
        }
    };

    const onGoogle = async (credential) => {
        setGoogleBusy(true);
        try {
            const user = await loginWithGoogle(credential);
            toast.success(`Welcome, ${user.username}`, "Signed in with Google.");
            navigate(destination, { replace: true });
        } catch (error) {
            form.setServerError(errorMessage(error, "Google sign-in was rejected."));
        } finally {
            setGoogleBusy(false);
        }
    };

    return (
        <AccessFrame
            eyebrow={<><Icons.LuKeyRound size={13} /> Access</>}
            title="Re-enter the proving ground"
            description="Your streaks, submissions and progress are exactly where you left them."
            aside={
                <AsidePanel
                    points={[
                        { icon: "LuHistory", text: "Every submission you have ever made, kept" },
                        { icon: "LuFlame", text: "Streaks continue from where you stopped" },
                        { icon: "LuLock", text: "Sessions are httpOnly cookies, not localStorage tokens" }
                    ]}
                />
            }
            footer={
                <>
                    New here? <Link to="/join" className="access__link">Claim a handle</Link>
                </>
            }
        >
            <Card size="lg" className="stack stack-5">
                <GoogleButton onCredential={onGoogle} disabled={submitting || googleBusy} />

                <div className="divider-label">or with email</div>

                <form className="stack stack-4" onSubmit={onSubmit} noValidate>
                    <ServerError message={form.serverError} />

                    <Field label="Email" error={form.errorFor("email")} required>
                        {(aria) => (
                            <Input
                                {...aria}
                                type="email"
                                autoComplete="email"
                                placeholder="you@domain.com"
                                leadingIcon={Icons.LuMail}
                                value={form.values.email}
                                onChange={form.set("email")}
                                onBlur={form.blur("email")}
                                autoFocus
                            />
                        )}
                    </Field>

                    <Field
                        label="Password"
                        error={form.errorFor("password")}
                        required
                        optionalNote={
                            <Link to="/recover" className="access__link">Forgot it?</Link>
                        }
                    >
                        {(aria) => (
                            <PasswordInput
                                {...aria}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={form.values.password}
                                onChange={form.set("password")}
                                onBlur={form.blur("password")}
                            />
                        )}
                    </Field>

                    <Button
                        as="button"
                        type="submit"
                        variant="primary"
                        size="lg"
                        block
                        loading={submitting || googleBusy}
                        trailingIcon={Icons.LuArrowRight}
                    >
                        Sign in
                    </Button>
                </form>
            </Card>
        </AccessFrame>
    );
};

/*
 |==========================================================================
 | Join — register
 |==========================================================================
 */

export const Join = () => {
    const { register, loginWithGoogle } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const [submitting, setSubmitting] = useState(false);
    const [accepted, setAccepted] = useState(false);

    const form = useForm(
        { username: "", email: "", password: "", confirm: "" },
        {
            username: validators.username,
            email: validators.email,
            password: validators.password,
            confirm: (value, values) => {
                if (!value) return "Repeat your password.";
                if (value !== values.password) return "The two passwords don't match.";
                return null;
            }
        }
    );

    const strength = scorePassword(form.values.password);

    const onSubmit = async (event) => {
        event.preventDefault();
        form.touchAll();
        if (!form.isValid || !accepted) return;

        setSubmitting(true);
        try {
            const user = await register({
                username: form.values.username.trim(),
                email: form.values.email.trim(),
                password: form.values.password
            });

            toast.success(
                `Handle claimed: ${user.username}`,
                "Your Dashboard is ready."
            );
            navigate(MODULE.deck.path, { replace: true });
        } catch (error) {
            form.setServerError(errorMessage(error, "Could not create your account."));
        } finally {
            setSubmitting(false);
        }
    };

    const onGoogle = async (credential) => {
        setSubmitting(true);
        try {
            const user = await loginWithGoogle(credential);
            toast.success(`Welcome, ${user.username}`, "Account linked to Google.");
            navigate(MODULE.deck.path, { replace: true });
        } catch (error) {
            form.setServerError(errorMessage(error, "Google sign-up was rejected."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AccessFrame
            eyebrow={<><Icons.LuUserPlus size={13} /> Enrolment</>}
            title="Claim your handle"
            description="One account. Every module. Nothing to pay and nothing to cancel."
            aside={
                <AsidePanel
                    points={[
                        { icon: "LuZap", text: "A real sandboxed judge, not a syntax checker" },
                        { icon: "LuSparkles", text: "Sage analyses your code without uploading it" },
                        { icon: "LuChartNoAxesColumn", text: "Analytics derived from your own record" }
                    ]}
                />
            }
            footer={
                <>
                    Already enrolled? <Link to="/enter" className="access__link">Sign in</Link>
                </>
            }
        >
            <Card size="lg" className="stack stack-5">
                <GoogleButton onCredential={onGoogle} disabled={submitting} />

                <div className="divider-label">or with email</div>

                <form className="stack stack-4" onSubmit={onSubmit} noValidate>
                    <ServerError message={form.serverError} />

                    <Field
                        label="Handle"
                        hint="This is how you appear on the Leaderboard."
                        error={form.errorFor("username")}
                        required
                    >
                        {(aria) => (
                            <Input
                                {...aria}
                                autoComplete="username"
                                placeholder="ada_lovelace"
                                leadingIcon={Icons.LuAtSign}
                                value={form.values.username}
                                onChange={form.set("username")}
                                onBlur={form.blur("username")}
                                autoFocus
                            />
                        )}
                    </Field>

                    <Field label="Email" error={form.errorFor("email")} required>
                        {(aria) => (
                            <Input
                                {...aria}
                                type="email"
                                autoComplete="email"
                                placeholder="you@domain.com"
                                leadingIcon={Icons.LuMail}
                                value={form.values.email}
                                onChange={form.set("email")}
                                onBlur={form.blur("email")}
                            />
                        )}
                    </Field>

                    <Field label="Password" error={form.errorFor("password")} required>
                        {(aria) => (
                            <div className="stack stack-3">
                                <PasswordInput
                                    {...aria}
                                    autoComplete="new-password"
                                    placeholder="At least 6 characters"
                                    value={form.values.password}
                                    onChange={form.set("password")}
                                    onBlur={form.blur("password")}
                                />
                                {form.values.password && (
                                    <StrengthMeter password={form.values.password} />
                                )}
                            </div>
                        )}
                    </Field>

                    <Field label="Confirm password" error={form.errorFor("confirm")} required>
                        {(aria) => (
                            <PasswordInput
                                {...aria}
                                autoComplete="new-password"
                                placeholder="Repeat it"
                                value={form.values.confirm}
                                onChange={form.set("confirm")}
                                onBlur={form.blur("confirm")}
                            />
                        )}
                    </Field>

                    <label className="access__consent">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                        />
                        <span>
                            I understand this is a learning platform and my submissions are
                            stored against my account.
                        </span>
                    </label>

                    <Button
                        as="button"
                        type="submit"
                        variant="primary"
                        size="lg"
                        block
                        disabled={!accepted}
                        loading={submitting}
                        trailingIcon={Icons.LuArrowRight}
                    >
                        {strength.score >= 3 ? "Create account" : "Create account"}
                    </Button>
                </form>
            </Card>
        </AccessFrame>
    );
};

/*
 |==========================================================================
 | Recover — forgot password
 |==========================================================================
 | The endpoint may not exist on every deployment. Rather than pretending an
 | email went out, a 404 surfaces an honest "not enabled here" state — a
 | fake confirmation would leave someone waiting for a message that is never
 | coming.
 */

export const Recover = () => {
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const [state, setState] = useState("idle"); // idle | sending | sent | unavailable | error
    const [detail, setDetail] = useState(null);

    const error = touched ? validators.email(email) : undefined;

    const onSubmit = async (event) => {
        event.preventDefault();
        setTouched(true);
        if (validators.email(email)) return;

        setState("sending");

        try {
            await client.post("/auth/forgot-password", { email: email.trim() });
            setState("sent");
        } catch (err) {
            const status = err?.response?.status;

            if (status === 404 || status === 501) {
                setState("unavailable");
            } else {
                setState("error");
                setDetail(errorMessage(err, "The request could not be completed."));
            }
        }
    };

    return (
        <AccessFrame
            eyebrow={<><Icons.LuLifeBuoy size={13} /> Recovery</>}
            title="Recover your access"
            description="Enter the email on your account and we'll send a reset link if one can be issued."
            aside={
                <AsidePanel
                    points={[
                        { icon: "LuShieldCheck", text: "Reset links are single-use and short-lived" },
                        { icon: "LuMailCheck", text: "We never reveal whether an address is registered" },
                        { icon: "LuKeyRound", text: "Signed in with Google? Use the Google button instead" }
                    ]}
                />
            }
            footer={
                <>
                    Remembered it? <Link to="/enter" className="access__link">Back to sign in</Link>
                </>
            }
        >
            <Card size="lg">
                {state === "sent" ? (
                    <motion.div
                        className="stack stack-4"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="access__result access__result--good">
                            <Icons.LuMailCheck size={22} aria-hidden="true" />
                        </span>
                        <h2 style={{ fontSize: "var(--fs-lg)" }}>Check your inbox</h2>
                        <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                            If <strong>{email}</strong> is attached to an account, a reset link
                            is on its way. It expires shortly, so use it soon. Nothing arrives
                            if the address isn't registered — that's deliberate.
                        </p>
                        <Button variant="secondary" to="/enter">Back to sign in</Button>
                    </motion.div>
                ) : state === "unavailable" ? (
                    <motion.div
                        className="stack stack-4"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        role="status"
                    >
                        <span className="access__result access__result--warn">
                            <Icons.LuConstruction size={22} aria-hidden="true" />
                        </span>
                        <h2 style={{ fontSize: "var(--fs-lg)" }}>Recovery isn't enabled here</h2>
                        <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                            This deployment has no password-reset endpoint configured, so no
                            email was sent — we'd rather say that than leave you waiting for a
                            message that isn't coming. Ask an administrator to reset the
                            account directly, or sign in with Google if the address matches.
                        </p>
                        <Button variant="secondary" to="/enter">Back to sign in</Button>
                    </motion.div>
                ) : (
                    <form className="stack stack-4" onSubmit={onSubmit} noValidate>
                        <ServerError message={state === "error" ? detail : null} />

                        <Field label="Account email" error={error} required>
                            {(aria) => (
                                <Input
                                    {...aria}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@domain.com"
                                    leadingIcon={Icons.LuMail}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={() => setTouched(true)}
                                    autoFocus
                                />
                            )}
                        </Field>

                        <Button
                            as="button"
                            type="submit"
                            variant="primary"
                            size="lg"
                            block
                            loading={state === "sending"}
                            trailingIcon={Icons.LuSend}
                        >
                            Send reset link
                        </Button>
                    </form>
                )}
            </Card>
        </AccessFrame>
    );
};

/*
 |==========================================================================
 | ResetPassword — the link the email points at
 |==========================================================================
 | Reached as /reset-password?token=... . The token is opaque here — it's
 | only ever sent to the backend, which is the only party that can tell
 | whether it's valid, unused, and unexpired.
 */

export const ResetPassword = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { refresh } = useAuth();
    const toast = useToast();

    const token = params.get("token") || "";

    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const form = useForm(
        { password: "", confirm: "" },
        {
            password: validators.password,
            confirm: (value, values) => {
                if (!value) return "Repeat your new password.";
                if (value !== values.password) return "The two passwords don't match.";
                return null;
            }
        }
    );

    const onSubmit = async (event) => {
        event.preventDefault();
        form.touchAll();
        if (!form.isValid) return;

        setSubmitting(true);
        try {
            const res = await client.post("/auth/reset-password", {
                token,
                password: form.values.password
            });
            // The backend issues a fresh session cookie on a successful
            // reset — refresh AuthContext so the app picks it up immediately
            // rather than treating this device as signed out until the next
            // page load.
            const user = res?.data?.data?.user;
            await refresh();
            setDone(true);
            if (user) toast.success("Password reset", `Signed in as ${user.username}.`);
        } catch (error) {
            form.setServerError(errorMessage(error, "That reset link could not be used."));
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <AccessFrame
                eyebrow={<><Icons.LuKeyRound size={13} /> Recovery</>}
                title="Missing reset link"
                description="This page needs a token from the email link — it isn't meant to be opened directly."
                aside={
                    <AsidePanel
                        points={[
                            { icon: "LuMailCheck", text: "Request a new link from the recovery page" },
                            { icon: "LuTimer", text: "Links expire after one hour" }
                        ]}
                    />
                }
                footer={
                    <>
                        <Link to="/recover" className="access__link">Request a new link</Link>
                    </>
                }
            >
                <Card size="lg" className="stack stack-4">
                    <span className="access__result access__result--warn">
                        <Icons.LuTriangleAlert size={22} aria-hidden="true" />
                    </span>
                    <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                        No reset token was found in the URL. Open the link from your email again,
                        or request a fresh one.
                    </p>
                    <Button variant="secondary" to="/recover">Go to recovery</Button>
                </Card>
            </AccessFrame>
        );
    }

    return (
        <AccessFrame
            eyebrow={<><Icons.LuKeyRound size={13} /> Recovery</>}
            title="Choose a new password"
            description="This link is single-use — once it works, it stops working."
            aside={
                <AsidePanel
                    points={[
                        { icon: "LuShieldCheck", text: "Your session updates immediately after this" },
                        { icon: "LuLock", text: "The old password stops working the moment you submit" },
                        { icon: "LuTimer", text: "Links expire one hour after being requested" }
                    ]}
                />
            }
            footer={
                <>
                    <Link to="/enter" className="access__link">Back to sign in</Link>
                </>
            }
        >
            <Card size="lg">
                {done ? (
                    <motion.div
                        className="stack stack-4"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="access__result access__result--good">
                            <Icons.LuCircleCheck size={22} aria-hidden="true" />
                        </span>
                        <h2 style={{ fontSize: "var(--fs-lg)" }}>Password updated</h2>
                        <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                            Your password has been changed and you're signed in on this device.
                        </p>
                        <Button variant="primary" onClick={() => navigate(MODULE.deck.path, { replace: true })}>
                            Go to your Dashboard
                        </Button>
                    </motion.div>
                ) : (
                    <form className="stack stack-4" onSubmit={onSubmit} noValidate>
                        <ServerError message={form.serverError} />

                        <Field label="New password" error={form.errorFor("password")} required>
                            {(aria) => (
                                <div className="stack stack-3">
                                    <PasswordInput
                                        {...aria}
                                        autoComplete="new-password"
                                        placeholder="At least 6 characters"
                                        value={form.values.password}
                                        onChange={form.set("password")}
                                        onBlur={form.blur("password")}
                                        autoFocus
                                    />
                                    {form.values.password && (
                                        <StrengthMeter password={form.values.password} />
                                    )}
                                </div>
                            )}
                        </Field>

                        <Field label="Confirm new password" error={form.errorFor("confirm")} required>
                            {(aria) => (
                                <PasswordInput
                                    {...aria}
                                    autoComplete="new-password"
                                    placeholder="Repeat it"
                                    value={form.values.confirm}
                                    onChange={form.set("confirm")}
                                    onBlur={form.blur("confirm")}
                                />
                            )}
                        </Field>

                        <Button
                            as="button"
                            type="submit"
                            variant="primary"
                            size="lg"
                            block
                            loading={submitting}
                            trailingIcon={Icons.LuArrowRight}
                        >
                            Reset password
                        </Button>
                    </form>
                )}
            </Card>
        </AccessFrame>
    );
};
