import React, { useMemo } from "react";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, BRAND, tierFor, TIERS } from "../config/brand";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks";
import { fetchAnalytics, fetchProgress } from "../services/account";
import {
    deriveStreaks, evaluateBadges, difficultyMeta, languageMeta,
    DIFFICULTY_ORDER
} from "../lib/domain";
import { number as fmtNumber, absoluteDate } from "../lib/format";
import {
    Card, CardHeader, Button, Badge, Avatar, StatTile,
    ProgressBar, Skeleton, ErrorState
} from "../components/ui";
import { PageHeader, Section } from "../components/shell/AppShell";
import {
    ActivityHeatmap, CompositionBar, ProgressRow, RadialMeter, seriesColor
} from "../components/charts";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Identity — the public record
 |==========================================================================
 | The user's profile as a *record* rather than a settings page: what they
 | have done, what they have earned, and how far they are from the next
 | tier. Editing lives in the Control Room.
 |
 | Every badge and figure here is computed from submission data. Nothing is
 | awarded for signing up or for time elapsed.
 */

const Identity = () => {
    const { user, stats } = useAuth();

    const analytics = useAsync(fetchAnalytics, []);
    const progress = useAsync(fetchProgress, []);

    const streaks = useMemo(
        () => deriveStreaks(analytics.data?.activityData || []),
        [analytics.data]
    );

    const languagesUsed = analytics.data?.languageDistribution?.length || 0;

    const badges = useMemo(
        () =>
            evaluateBadges({
                ...(stats || {}),
                languagesUsed,
                currentStreak: streaks.current,
                longestStreak: streaks.longest
            }),
        [stats, languagesUsed, streaks]
    );

    const unlocked = badges.filter((b) => b.unlocked);
    const tier = tierFor(stats?.problemsSolved || 0);
    const tierIndex = TIERS.findIndex((t) => t.id === tier.current.id);

    const difficultyRows = useMemo(
        () =>
            DIFFICULTY_ORDER.map((level) => ({
                label: level,
                value: stats?.difficultyBreakdown?.[level] || 0,
                color: difficultyMeta(level).color
            })),
        [stats]
    );

    const languageRows = useMemo(
        () =>
            (analytics.data?.languageDistribution || []).map((row, i) => ({
                label: languageMeta(row.language).label,
                value: row.count,
                color: languageMeta(row.language).color || seriesColor(i)
            })),
        [analytics.data]
    );

    const links = [
        user?.githubUrl && { icon: Icons.LuGithub, label: "GitHub", href: user.githubUrl },
        user?.linkedinUrl && { icon: Icons.LuLinkedin, label: "LinkedIn", href: user.linkedinUrl }
    ].filter(Boolean);

    if (analytics.error && progress.error) {
        return (
            <div className="shell">
                <ErrorState
                    title="Profile couldn't load"
                    body="Your record is intact — this is a read failure, not data loss."
                    onRetry={() => {
                        analytics.reload();
                        progress.reload();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.identity.group}
                title={MODULE.identity.label}
                description={`Your record on ${BRAND.name} — earned, not awarded.`}
                actions={
                    <Button variant="secondary" to={MODULE.control.path} icon={Icons.LuSettings2}>
                        Edit in Settings
                    </Button>
                }
            />

            {/* ── Identity card ─────────────────────────────────────── */}

            <Card size="lg" edge className="identity">
                <div className="identity__main">
                    <Avatar name={user?.username} size="xl" ring />

                    <div className="stack stack-3" style={{ minWidth: 0, flex: 1 }}>
                        <div className="stack stack-1">
                            <h2 className="identity__name">{user?.username}</h2>
                            <span className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                                {user?.email}
                            </span>
                        </div>

                        <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                            <Badge
                                size="lg"
                                tone="neutral"
                                icon={Icons.LuShield}
                                style={{ color: tier.current.accent, borderColor: tier.current.accent }}
                            >
                                {tier.current.label}
                            </Badge>

                            {user?.role === "admin" && (
                                <Badge tone="brand" size="lg" icon={Icons.LuShieldCheck}>
                                    Admin
                                </Badge>
                            )}

                            {user?.preferredLanguage && (
                                <Badge tone="neutral" size="lg" icon={Icons.LuCode}>
                                    {languageMeta(user.preferredLanguage).label}
                                </Badge>
                            )}

                            <Badge tone="neutral" size="lg" icon={Icons.LuCalendar}>
                                Joined {absoluteDate(user?.createdAt)}
                            </Badge>
                        </div>

                        {user?.bio && <p className="identity__bio">{user.bio}</p>}

                        <div className="row row-wrap" style={{ gap: "var(--sp-4)" }}>
                            {user?.college && (
                                <span className="identity__meta">
                                    <Icons.LuGraduationCap size={14} aria-hidden="true" />
                                    {user.college}
                                </span>
                            )}
                            {user?.location && (
                                <span className="identity__meta">
                                    <Icons.LuMapPin size={14} aria-hidden="true" />
                                    {user.location}
                                </span>
                            )}
                            {links.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="identity__meta identity__meta--link"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                >
                                    <link.icon size={14} aria-hidden="true" />
                                    {link.label}
                                    <Icons.LuExternalLink size={11} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="identity__meter">
                        <RadialMeter
                            value={progress.data?.overall?.solved || 0}
                            max={progress.data?.overall?.total || 1}
                            size={124}
                            caption="Archive"
                        />
                    </div>
                </div>

                {/* ── Tier ladder ───────────────────────────────────── */}

                <div className="stack stack-3">
                    <div className="row row-between">
                        <span className="console__label">Tier progression</span>
                        <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                            {tier.next
                                ? `${tier.toNext} more problems to ${tier.next.label}`
                                : "Highest tier reached"}
                        </span>
                    </div>

                    <div className="ladder">
                        {TIERS.map((t, i) => (
                            <div
                                key={t.id}
                                className={`ladder__step ${i <= tierIndex ? "ladder__step--on" : ""}`}
                                style={{ "--accent": t.accent }}
                                title={`${t.label} — ${t.min}+ problems solved`}
                            >
                                <span className="ladder__dot" aria-hidden="true" />
                                <span className="ladder__label">{t.label}</span>
                                <span className="ladder__min tnum">{t.min}+</span>
                            </div>
                        ))}
                    </div>

                    <ProgressBar
                        value={tier.progress}
                        label={`${tier.progress}% toward ${tier.next?.label || "the maximum tier"}`}
                        color={tier.current.accent}
                        thin
                    />
                </div>
            </Card>

            {/* ── Figures ───────────────────────────────────────────── */}

            <motion.div
                className="autogrid"
                style={{ "--min": "205px", marginTop: "var(--sp-8)" }}
                variants={staggerParent(0.06)}
                initial="initial"
                animate="animate"
            >
                <StatTile
                    label="Problems conquered"
                    value={fmtNumber(stats?.problemsSolved || 0)}
                    icon={Icons.LuTarget}
                    accent="var(--brand-violet)"
                />
                <StatTile
                    label="Submissions"
                    value={fmtNumber(stats?.totalSubmissions || 0)}
                    icon={Icons.LuSend}
                    sub={`${fmtNumber(stats?.acceptedSubmissions || 0)} accepted`}
                    accent="var(--series-1)"
                />
                <StatTile
                    label="Acceptance rate"
                    value={`${stats?.acceptanceRate || 0}%`}
                    icon={Icons.LuCrosshair}
                    accent="var(--series-3)"
                />
                <StatTile
                    label="Longest streak"
                    value={`${streaks.longest} days`}
                    icon={Icons.LuFlame}
                    sub={`${streaks.current} currently`}
                    accent="var(--status-warning)"
                />
            </motion.div>

            {/* ── Badges ────────────────────────────────────────────── */}

            <Section
                title="Badges"
                description={`${unlocked.length} of ${badges.length} earned. Each one is a computed fact about your record.`}
                icon={Icons.LuAward}
                style={{ marginTop: "var(--sp-8)" }}
            >
                <motion.div
                    className="autogrid"
                    style={{ "--min": "230px", "--gap": "var(--sp-3)" }}
                    variants={staggerParent(0.04)}
                    initial="initial"
                    animate="animate"
                >
                    {badges.map((badge) => {
                        const Icon = Icons[badge.icon] || Icons.LuAward;

                        return (
                            <motion.div
                                key={badge.id}
                                className={`badge-card ${badge.unlocked ? "badge-card--on" : ""}`}
                                variants={riseChild}
                            >
                                <span className="badge-card__icon" aria-hidden="true">
                                    <Icon size={19} />
                                </span>

                                <div className="stack stack-1" style={{ minWidth: 0 }}>
                                    <span className="badge-card__label">
                                        {badge.label}
                                        {!badge.unlocked && (
                                            <Icons.LuLock
                                                size={11}
                                                aria-label="Locked"
                                                style={{ marginLeft: 6, verticalAlign: "-1px" }}
                                            />
                                        )}
                                    </span>
                                    <span className="badge-card__blurb">{badge.blurb}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </Section>

            {/* ── Breakdown ─────────────────────────────────────────── */}

            <div className="autogrid" style={{ "--min": "330px", marginTop: "var(--sp-8)" }}>
                <Card size="lg">
                    <CardHeader
                        title="Difficulty spread"
                        subtitle="Unique problems solved"
                        icon={Icons.LuLayers}
                    />
                    {progress.loading ? (
                        <Skeleton h={150} radius="var(--r-md)" />
                    ) : (
                        <div className="stack stack-5">
                            <CompositionBar data={difficultyRows} height={16} />
                            <div className="stack stack-4">
                                {(progress.data?.byDifficulty || []).map((row) => (
                                    <ProgressRow
                                        key={row.difficulty}
                                        label={row.difficulty}
                                        solved={row.solved}
                                        total={row.total}
                                        color={difficultyMeta(row.difficulty).color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Card size="lg">
                    <CardHeader
                        title="Languages"
                        subtitle="Submissions per language"
                        icon={Icons.LuLanguages}
                    />
                    {analytics.loading ? (
                        <Skeleton h={150} radius="var(--r-md)" />
                    ) : languageRows.length ? (
                        <CompositionBar data={languageRows} height={16} />
                    ) : (
                        <p className="chart__empty">Nothing submitted yet.</p>
                    )}
                </Card>
            </div>

            {/* ── Activity ──────────────────────────────────────────── */}

            <Section
                title="Activity"
                description="Ninety days, one square per day."
                icon={Icons.LuCalendarDays}
                style={{ marginTop: "var(--sp-8)" }}
            >
                <Card>
                    {analytics.loading ? (
                        <Skeleton h={130} radius="var(--r-md)" />
                    ) : (
                        <ActivityHeatmap data={analytics.data?.activityData || []} weeks={20} />
                    )}
                </Card>
            </Section>
        </div>
    );
};

export default Identity;
