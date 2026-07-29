import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, BRAND } from "../config/brand";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { updateProfile, deleteAccount } from "../services/account";
import { errorMessage } from "../api/client";
import { RUNNABLE_LANGUAGES, languageMeta } from "../lib/domain";
import {
    Card, CardHeader, Button, Badge, Field, Input, TextArea, Select,
    SwitchRow, Segmented, ConfirmDialog, Tabs
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";

/*
 |==========================================================================
 | Control Room — settings
 |==========================================================================
 | Four groups, one per concern: who you are, how it looks, how the editor
 | behaves, and the account itself.
 |
 | The profile form is dirty-tracked so "Save" is only ever enabled when
 | there is something to save — an always-live save button trains people to
 | click it reflexively and makes accidental writes likelier.
 */

const EMPTY_PROFILE = {
    username: "", email: "", bio: "", location: "",
    college: "", githubUrl: "", linkedinUrl: "", preferredLanguage: "cpp"
};

const Control = () => {
    const { user, updateUser, logout, refresh } = useAuth();
    const {
        scheme, setScheme, density, setDensity,
        editorFontSize, setEditorFontSize, reduceMotion, setReduceMotion
    } = useTheme();
    const toast = useToast();

    const [tab, setTab] = useState("profile");

    /* ── Profile form ──────────────────────────────────────────────────── */

    const [form, setForm] = useState(EMPTY_PROFILE);
    const [initial, setInitial] = useState(EMPTY_PROFILE);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!user) return;

        const next = {
            username: user.username || "",
            email: user.email || "",
            bio: user.bio || "",
            location: user.location || "",
            college: user.college || "",
            githubUrl: user.githubUrl || "",
            linkedinUrl: user.linkedinUrl || "",
            preferredLanguage: user.preferredLanguage || "cpp"
        };

        setForm(next);
        setInitial(next);
    }, [user]);

    const dirty = JSON.stringify(form) !== JSON.stringify(initial);

    const set = (key) => (event) => {
        setForm((prev) => ({ ...prev, [key]: event.target.value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const validate = () => {
        const next = {};

        if (!form.username.trim()) next.username = "A handle is required.";
        else if (form.username.trim().length < 3) next.username = "At least 3 characters.";

        if (!form.email.trim()) next.email = "An email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            next.email = "That doesn't look like an email address.";
        }

        // A relative URL in an href silently resolves against the app's own
        // origin, which is never what someone meant by "my GitHub".
        ["githubUrl", "linkedinUrl"].forEach((key) => {
            const value = form[key].trim();
            if (value && !/^https?:\/\//i.test(value)) {
                next[key] = "Include the full https:// address.";
            }
        });

        if (form.bio.length > 500) next.bio = "Keep it under 500 characters.";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const save = async (event) => {
        event.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            const updated = await updateProfile({
                username: form.username.trim(),
                email: form.email.trim(),
                bio: form.bio.trim(),
                location: form.location.trim(),
                college: form.college.trim(),
                githubUrl: form.githubUrl.trim(),
                linkedinUrl: form.linkedinUrl.trim(),
                preferredLanguage: form.preferredLanguage
            });

            updateUser(updated);
            setInitial(form);
            toast.success("Profile saved", "Your Identity page is updated.");
        } catch (error) {
            const message = errorMessage(error, "Couldn't save your profile.");
            // A 409 is always the email uniqueness check — pin it to the field.
            if (error?.response?.status === 409) {
                setErrors({ email: message });
            } else {
                toast.error("Save failed", message);
            }
        } finally {
            setSaving(false);
        }
    };

    /* ── Danger zone ───────────────────────────────────────────────────── */

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const destroyAccount = async () => {
        setDeleting(true);
        try {
            await deleteAccount();
            toast.info("Account deleted", "Everything has been removed.");
            await logout();
        } catch (error) {
            toast.error("Couldn't delete the account", errorMessage(error));
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    /* ── Render ────────────────────────────────────────────────────────── */

    const tabs = [
        { id: "profile", label: "Profile", icon: Icons.LuUserRound },
        { id: "appearance", label: "Appearance", icon: Icons.LuPalette },
        { id: "workspace", label: "Workspace", icon: Icons.LuCode },
        { id: "account", label: "Account", icon: Icons.LuShieldAlert }
    ];

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.control.group}
                title={MODULE.control.label}
                description={`Everything about how ${BRAND.name} looks, behaves and represents you.`}
                actions={
                    dirty && (
                        <Badge tone="warning" icon={Icons.LuCircleDot} size="lg">
                            Unsaved changes
                        </Badge>
                    )
                }
            >
                <Tabs items={tabs} value={tab} onChange={setTab} />
            </PageHeader>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* ── Profile ───────────────────────────────────── */}

                    {tab === "profile" && (
                        <form className="control__grid" onSubmit={save}>
                            <Card size="lg" className="stack stack-5">
                                <CardHeader
                                    title="Who you are"
                                    subtitle="Shown on your Profile and the Leaderboard"
                                    icon={Icons.LuUserRound}
                                />

                                <div className="autogrid" style={{ "--min": "240px" }}>
                                    <Field label="Handle" error={errors.username} required>
                                        {(aria) => (
                                            <Input
                                                {...aria}
                                                value={form.username}
                                                onChange={set("username")}
                                                leadingIcon={Icons.LuAtSign}
                                                autoComplete="username"
                                            />
                                        )}
                                    </Field>

                                    <Field label="Email" error={errors.email} required>
                                        {(aria) => (
                                            <Input
                                                {...aria}
                                                type="email"
                                                value={form.email}
                                                onChange={set("email")}
                                                leadingIcon={Icons.LuMail}
                                                autoComplete="email"
                                            />
                                        )}
                                    </Field>
                                </div>

                                <Field
                                    label="Bio"
                                    error={errors.bio}
                                    hint={`${form.bio.length} / 500 characters`}
                                >
                                    {(aria) => (
                                        <TextArea
                                            {...aria}
                                            value={form.bio}
                                            onChange={set("bio")}
                                            placeholder="What are you working toward?"
                                            maxLength={500}
                                        />
                                    )}
                                </Field>

                                <div className="autogrid" style={{ "--min": "240px" }}>
                                    <Field label="Location">
                                        {(aria) => (
                                            <Input
                                                {...aria}
                                                value={form.location}
                                                onChange={set("location")}
                                                leadingIcon={Icons.LuMapPin}
                                                placeholder="Bengaluru, India"
                                            />
                                        )}
                                    </Field>

                                    <Field label="College or company">
                                        {(aria) => (
                                            <Input
                                                {...aria}
                                                value={form.college}
                                                onChange={set("college")}
                                                leadingIcon={Icons.LuGraduationCap}
                                            />
                                        )}
                                    </Field>

                                    <Field label="GitHub" error={errors.githubUrl}>
                                        {(aria) => (
                                            <Input
                                                {...aria}
                                                type="url"
                                                value={form.githubUrl}
                                                onChange={set("githubUrl")}
                                                leadingIcon={Icons.LuGithub}
                                                placeholder="https://github.com/you"
                                            />
                                        )}
                                    </Field>

                                    <Field label="LinkedIn" error={errors.linkedinUrl}>
                                        {(aria) => (
                                            <Input
                                                {...aria}
                                                type="url"
                                                value={form.linkedinUrl}
                                                onChange={set("linkedinUrl")}
                                                leadingIcon={Icons.LuLinkedin}
                                                placeholder="https://linkedin.com/in/you"
                                            />
                                        )}
                                    </Field>
                                </div>

                                <Field
                                    label="Default language"
                                    hint="Pre-selected in the editor when a problem supports it."
                                >
                                    {(aria) => (
                                        <Select
                                            {...aria}
                                            value={form.preferredLanguage}
                                            onChange={set("preferredLanguage")}
                                            options={RUNNABLE_LANGUAGES.map((id) => ({
                                                value: id,
                                                label: languageMeta(id).label
                                            }))}
                                        />
                                    )}
                                </Field>

                                <div className="row" style={{ gap: "var(--sp-3)" }}>
                                    <Button
                                        as="button"
                                        type="submit"
                                        variant="primary"
                                        icon={Icons.LuSave}
                                        loading={saving}
                                        disabled={!dirty}
                                    >
                                        Save changes
                                    </Button>

                                    {dirty && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setForm(initial);
                                                setErrors({});
                                            }}
                                        >
                                            Discard
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </form>
                    )}

                    {/* ── Appearance ────────────────────────────────── */}

                    {tab === "appearance" && (
                        <div className="control__grid">
                            <Card size="lg" className="stack stack-6">
                                <CardHeader
                                    title="Colour scheme"
                                    subtitle="Dark is the designed default; light is a selected counterpart, not an inversion."
                                    icon={Icons.LuPalette}
                                />

                                <Segmented
                                    items={[
                                        { id: "dark", label: "Dark", icon: Icons.LuMoon },
                                        { id: "light", label: "Light", icon: Icons.LuSun },
                                        { id: "system", label: "System", icon: Icons.LuMonitor }
                                    ]}
                                    value={scheme}
                                    onChange={setScheme}
                                />

                                <hr className="hairline" />

                                <div className="stack stack-3">
                                    <span className="console__label">Density</span>
                                    <Segmented
                                        items={[
                                            { id: "comfortable", label: "Comfortable" },
                                            { id: "compact", label: "Compact" }
                                        ]}
                                        value={density}
                                        onChange={setDensity}
                                    />
                                    <span className="field__hint">
                                        Compact tightens vertical rhythm across tables and lists.
                                    </span>
                                </div>

                                <hr className="hairline" />

                                <SwitchRow
                                    label="Reduce motion"
                                    description="Turns off page transitions and decorative animation. Your operating system's reduced-motion setting is always honoured regardless of this switch."
                                    checked={reduceMotion}
                                    onChange={setReduceMotion}
                                />
                            </Card>
                        </div>
                    )}

                    {/* ── Workspace ─────────────────────────────────── */}

                    {tab === "workspace" && (
                        <div className="control__grid">
                            <Card size="lg" className="stack stack-6">
                                <CardHeader
                                    title="Code Editor"
                                    subtitle="Editor behaviour and layout"
                                    icon={Icons.LuCode}
                                />

                                <div className="stack stack-3">
                                    <div className="row row-between">
                                        <span className="console__label">Editor font size</span>
                                        <span className="tnum" style={{ fontWeight: "var(--fw-semi)" }}>
                                            {editorFontSize}px
                                        </span>
                                    </div>

                                    <input
                                        type="range"
                                        min="11"
                                        max="22"
                                        step="1"
                                        value={editorFontSize}
                                        onChange={(e) => setEditorFontSize(Number(e.target.value))}
                                        className="range"
                                        aria-label="Editor font size in pixels"
                                    />

                                    <pre
                                        className="console__out"
                                        style={{ fontSize: editorFontSize, maxHeight: "none" }}
                                    >
{`for (int i = 0; i < n; ++i)
    total += a[i];`}
                                    </pre>
                                </div>

                                <hr className="hairline" />

                                <div className="stack stack-3">
                                    <span className="console__label">Panel layout</span>
                                    <p className="field__hint">
                                        Splitter positions are saved automatically as you drag them.
                                        Double-click a divider to reset it, or clear them here.
                                    </p>
                                    <Button
                                        variant="secondary"
                                        icon={Icons.LuRotateCcw}
                                        onClick={() => {
                                            try {
                                                localStorage.removeItem("axiom.forge.split.h");
                                                localStorage.removeItem("axiom.forge.split.v");
                                            } catch { /* nothing to clear */ }
                                            toast.success("Layout reset", "The editor reopens at its default split.");
                                        }}
                                    >
                                        Reset editor layout
                                    </Button>
                                </div>

                                <hr className="hairline" />

                                <div className="stack stack-3">
                                    <span className="console__label">Local drafts</span>
                                    <p className="field__hint">
                                        Your in-progress code is saved in this browser, per problem and
                                        per language. Clearing it cannot be undone.
                                    </p>
                                    <Button
                                        variant="danger"
                                        icon={Icons.LuTrash2}
                                        onClick={() => {
                                            let removed = 0;
                                            try {
                                                Object.keys(localStorage)
                                                    .filter((k) => k.startsWith("axiom.draft."))
                                                    .forEach((k) => {
                                                        localStorage.removeItem(k);
                                                        removed += 1;
                                                    });
                                            } catch { /* nothing to clear */ }

                                            toast.info(
                                                "Drafts cleared",
                                                `${removed} saved draft${removed === 1 ? "" : "s"} removed.`
                                            );
                                        }}
                                    >
                                        Clear all saved drafts
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ── Account ───────────────────────────────────── */}

                    {tab === "account" && (
                        <div className="control__grid">
                            <Card size="lg" className="stack stack-5">
                                <CardHeader
                                    title="Session"
                                    subtitle="How you are signed in"
                                    icon={Icons.LuKeyRound}
                                />

                                <div className="stack stack-3">
                                    <div className="control__row">
                                        <span>Signed in as</span>
                                        <strong>{user?.email}</strong>
                                    </div>
                                    <div className="control__row">
                                        <span>Role</span>
                                        <Badge tone={user?.role === "admin" ? "brand" : "neutral"}>
                                            {user?.role === "admin" ? "Admin" : "User"}
                                        </Badge>
                                    </div>
                                    <div className="control__row">
                                        <span>Session type</span>
                                        <span className="text-muted">
                                            httpOnly cookie, 7-day expiry
                                        </span>
                                    </div>
                                </div>

                                <div className="row" style={{ gap: "var(--sp-3)" }}>
                                    <Button variant="secondary" icon={Icons.LuRefreshCw} onClick={refresh}>
                                        Refresh session
                                    </Button>
                                    <Button variant="ghost" icon={Icons.LuLogOut} onClick={logout}>
                                        Sign out
                                    </Button>
                                </div>
                            </Card>

                            <Card size="lg" className="stack stack-5 control__danger">
                                <CardHeader
                                    title="Delete account"
                                    subtitle="Permanent and immediate"
                                    icon={Icons.LuShieldAlert}
                                />

                                <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                                    This removes your account from {BRAND.name}. Your submissions,
                                    streaks, badges and standing go with it. There is no recovery
                                    path and no grace period.
                                </p>

                                <Button
                                    variant="danger"
                                    icon={Icons.LuTrash2}
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    Delete my account
                                </Button>
                            </Card>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={destroyAccount}
                loading={deleting}
                title="Delete your account?"
                body={`Every submission, badge and streak attached to ${user?.email} will be removed permanently. This cannot be undone and there is no backup you can ask us to restore.`}
                confirmLabel="Delete permanently"
                cancelLabel="Keep my account"
            />
        </div>
    );
};

export default Control;
