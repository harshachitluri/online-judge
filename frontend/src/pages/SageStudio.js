import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE } from "../config/brand";
import { askAssistant } from "../services/ai";
import { useAuth } from "../context/AuthContext";
import { useLocalStorage } from "../hooks";
import { errorMessage } from "../api/client";
import { runnableOnly, RUNNABLE_LANGUAGES, languageMeta, FALLBACK_STARTER } from "../lib/domain";
import { Card, Button, Badge, Avatar, Input, TextArea, Select, Segmented, Spinner } from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { ComplexityPanel, ReviewPanel } from "../components/forge/SagePanel";
import { Mark } from "../components/shell/Logo";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | AI Assistant — the standalone studio
 |==========================================================================
 | The Forge embeds the same Complexity/Review panels beside a specific
 | problem. This page adds a scratchpad plus a real chat: paste any code,
 | ask about it in your own words, get a genuinely AI-generated answer.
 |
 | Two different engines power this page, and the UI is explicit about
 | which is which:
 |   · Complexity / Review tabs — instant local heuristics (services/sage.js).
 |     Nothing leaves the browser; the trade-off is they can only recognise
 |     patterns they were explicitly written to look for.
 |   · Ask (chat) — a real call to Gemini via the backend. Slower, costs a
 |     network round trip, but actually reasons about arbitrary questions.
 |     Your code and message DO leave the device for this one.
 */

const SUGGESTIONS = [
    { icon: "LuGauge",    text: "What's the time complexity of this?" },
    { icon: "LuScanEye",  text: "Review this for correctness and performance" },
    { icon: "LuLightbulb", text: "How would you approach optimising this?" }
];

/* ── Message rendering ─────────────────────────────────────────────────── */

const Reply = ({ reply }) => <p>{reply.text}</p>;

/* ── Page ──────────────────────────────────────────────────────────────── */

const SageStudio = () => {
    const { user } = useAuth();

    const [language, setLanguage] = useState(user?.preferredLanguage || "cpp");
    const [code, setCode] = useLocalStorage("axiom.sage.scratch", "");
    const [panel, setPanel] = useState("chat");

    const [messages, setMessages] = useState([
        {
            id: "intro",
            role: "ai",
            reply: {
                kind: "text",
                text:
                    "Ask me anything about the code in the scratchpad — complexity, bugs, " +
                    "how to approach it, whatever. This chat is real: your message and code " +
                    "go to the server and on to Gemini to generate an answer. The " +
                    "Complexity and Review tabs, by contrast, run entirely on your device."
            }
        }
    ]);

    const [sending, setSending] = useState(false);
    const [draft, setDraft] = useState("");
    const scrollRef = useRef(null);

    // Keep the newest message in view without yanking the whole page.
    useEffect(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [messages, sending]);

    const send = async (text) => {
        const question = (text ?? draft).trim();
        if (!question || sending) return;

        const userMessage = { id: `u-${Date.now()}`, role: "user", text: question };

        // The last several turns ride along as context so the assistant can
        // answer a follow-up ("what about the space complexity?") without
        // the user having to restate everything.
        const history = messages
            .filter((m) => m.reply?.kind === "text" || m.role === "user")
            .slice(-10)
            .map((m) => ({
                role: m.role === "user" ? "user" : "model",
                text: m.role === "user" ? m.text : m.reply.text
            }));

        setMessages((prev) => [...prev, userMessage]);
        setDraft("");
        setSending(true);

        try {
            const { reply } = await askAssistant({
                mode: "chat",
                message: question,
                code,
                language,
                history
            });

            setMessages((prev) => [
                ...prev,
                { id: `a-${Date.now()}`, role: "ai", reply: { kind: "text", text: reply } }
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `a-${Date.now()}`,
                    role: "ai",
                    error: true,
                    reply: {
                        kind: "text",
                        text: errorMessage(
                            error,
                            "The AI Assistant couldn't respond just now. Please try again."
                        )
                    }
                }
            ]);
        } finally {
            setSending(false);
        }
    };

    const seedStarter = () => setCode(FALLBACK_STARTER[language] || "");

    const lineCount = useMemo(
        () => (code ? code.split("\n").length : 0),
        [code]
    );

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.sage.group}
                title={MODULE.sage.label}
                description="Chat is real AI (Gemini) — your code and question are sent to the server to generate an answer. Complexity and Review stay instant and fully local."
                actions={
                    <Badge tone="brand" icon={Icons.LuSparkles} size="lg">
                        Powered by Gemini
                    </Badge>
                }
            />

            <div className="sage">
                {/* ── Scratchpad ────────────────────────────────────── */}

                <Card size="lg" className="sage__editor">
                    <div className="row row-between row-wrap" style={{ gap: "var(--sp-3)" }}>
                        <div className="stack stack-1">
                            <span className="console__label">Scratchpad</span>
                            <span className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                                {lineCount} {lineCount === 1 ? "line" : "lines"} · saved locally
                            </span>
                        </div>

                        <div className="row" style={{ gap: "var(--sp-2)" }}>
                            <Select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                aria-label="Language"
                                style={{ width: "auto", height: 34, fontSize: "var(--fs-xs)" }}
                                options={runnableOnly(RUNNABLE_LANGUAGES).map((id) => ({
                                    value: id,
                                    label: languageMeta(id).label
                                }))}
                            />

                            <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={Icons.LuFilePlus2}
                                onClick={seedStarter}
                                aria-label="Insert starter template"
                                title="Insert starter template"
                            />

                            <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={Icons.LuTrash2}
                                onClick={() => setCode("")}
                                aria-label="Clear the scratchpad"
                                title="Clear"
                            />
                        </div>
                    </div>

                    <TextArea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={`Paste ${languageMeta(language).label} here and ask Sage about it…`}
                        spellCheck="false"
                        className="mono sage__code"
                        aria-label="Code scratchpad"
                    />
                </Card>

                {/* ── Panels ────────────────────────────────────────── */}

                <Card size="lg" className="sage__panel">
                    <Segmented
                        items={[
                            { id: "chat", label: "Ask", icon: Icons.LuMessageSquare },
                            { id: "complexity", label: "Complexity", icon: Icons.LuGauge },
                            { id: "review", label: "Review", icon: Icons.LuScanEye }
                        ]}
                        value={panel}
                        onChange={setPanel}
                    />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={panel}
                            className="sage__panel-body"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                        >
                            {panel === "complexity" && (
                                <ComplexityPanel code={code} language={language} />
                            )}

                            {panel === "review" && (
                                <ReviewPanel code={code} language={language} />
                            )}

                            {panel === "chat" && (
                                <div className="chat">
                                    <div className="chat__log" ref={scrollRef}>
                                        <motion.div
                                            className="stack stack-4"
                                            variants={staggerParent(0.04)}
                                            initial="initial"
                                            animate="animate"
                                        >
                                            {messages.map((message) => (
                                                <motion.div
                                                    key={message.id}
                                                    className={`bubble bubble--${message.role} ${message.error ? "bubble--error" : ""}`}
                                                    variants={riseChild}
                                                >
                                                    <span className="bubble__avatar" aria-hidden="true">
                                                        {message.role === "ai"
                                                            ? <Mark size={18} />
                                                            : <Avatar name={user?.username} size="xs" />}
                                                    </span>

                                                    <div className="bubble__body">
                                                        {message.role === "user"
                                                            ? <p>{message.text}</p>
                                                            : <Reply reply={message.reply} />}
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {sending && (
                                                <motion.div className="bubble bubble--ai" variants={riseChild}>
                                                    <span className="bubble__avatar" aria-hidden="true">
                                                        <Mark size={18} />
                                                    </span>
                                                    <div className="bubble__body row" style={{ gap: "var(--sp-2)" }}>
                                                        <Spinner size={13} />
                                                        <span className="text-muted">Thinking…</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    </div>

                                    <div className="chat__suggestions">
                                        {SUGGESTIONS.map((s) => {
                                            const Icon = Icons[s.icon] || Icons.LuSparkles;
                                            return (
                                                <button
                                                    key={s.text}
                                                    type="button"
                                                    className="chat__suggestion"
                                                    onClick={() => send(s.text)}
                                                    disabled={sending}
                                                >
                                                    <Icon size={13} aria-hidden="true" />
                                                    {s.text}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <form
                                        className="chat__composer"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            send();
                                        }}
                                    >
                                        <Input
                                            value={draft}
                                            onChange={(e) => setDraft(e.target.value)}
                                            placeholder="Ask about complexity, performance, or how to approach this…"
                                            aria-label="Ask the AI Assistant a question"
                                            disabled={sending}
                                        />
                                        <Button
                                            as="button"
                                            type="submit"
                                            variant="primary"
                                            iconOnly
                                            icon={Icons.LuSend}
                                            disabled={!draft.trim() || sending}
                                            loading={sending}
                                            aria-label="Send"
                                        />
                                    </form>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Card>
            </div>

            <p className="sage__footnote">
                <Icons.LuInfo size={13} aria-hidden="true" />
                The Ask chat is a real call to Gemini and can be wrong — verify anything
                it tells you about correctness. It cannot execute your code, so a
                complexity estimate is still an estimate, not a proof.
            </p>
        </div>
    );
};

export default SageStudio;
