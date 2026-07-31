import React, { useState, useMemo } from "react";
import * as Icons from "react-icons/lu";

/*
 |==========================================================================
 | Markdown
 |==========================================================================
 | The AI Assistant answers in Markdown — headings, bullets, fenced code.
 | Rendering that string into a single <p> is why replies read as a wall of
 | text with stray asterisks in them, so this turns it into real elements.
 |
 | It is deliberately a small hand-rolled parser rather than a dependency:
 | the input is one model's output, not arbitrary user documents, and the
 | subset below (headings, lists, code, quotes, tables, inline emphasis) is
 | everything that subset actually produces.
 |
 | Nothing here ever touches dangerouslySetInnerHTML — every branch returns
 | React elements, so a reply that contains HTML is shown as text, not run.
 */

/* ── Inline ────────────────────────────────────────────────────────────── */

const INLINE_PATTERN = new RegExp(
    [
        "`[^`\\n]+`",                 // `code`
        "\\*\\*[^*\\n]+\\*\\*",       // **bold**
        "__[^_\\n]+__",               // __bold__
        "\\*[^*\\n]+\\*",             // *italic*
        "~~[^~\\n]+~~",               // ~~strike~~
        "\\[[^\\]\\n]+\\]\\([^)\\s]+\\)" // [text](href)
    ].join("|"),
    "g"
);

/* Only schemes that can't execute script. Anything else renders as plain
   text — a model-authored `javascript:` link is not worth the risk. */
const isSafeHref = (href) => /^(https?:\/\/|mailto:|\/)/i.test(href);

const renderInline = (text, keyPrefix = "i") => {
    const nodes = [];
    let last = 0;
    let match;

    INLINE_PATTERN.lastIndex = 0;

    while ((match = INLINE_PATTERN.exec(text)) !== null) {
        const token = match[0];

        if (match.index > last) {
            nodes.push(text.slice(last, match.index));
        }
        last = match.index + token.length;

        const key = `${keyPrefix}-${match.index}`;

        if (token.startsWith("`")) {
            nodes.push(<code key={key} className="md__code">{token.slice(1, -1)}</code>);
        } else if (token.startsWith("**") || token.startsWith("__")) {
            nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith("~~")) {
            nodes.push(<s key={key}>{token.slice(2, -2)}</s>);
        } else if (token.startsWith("*") || token.startsWith("_")) {
            nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
        } else {
            const split = token.indexOf("](");
            const label = token.slice(1, split);
            const href = token.slice(split + 2, -1);

            nodes.push(
                isSafeHref(href) ? (
                    <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="md__link">
                        {label}
                    </a>
                ) : (
                    label
                )
            );
        }
    }

    if (last < text.length) nodes.push(text.slice(last));

    return nodes;
};

/* ── Code block ────────────────────────────────────────────────────────── */

const CodeBlock = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* Clipboard denied (insecure origin, permissions) — the code is
               still selectable, so there is nothing worth erroring about. */
        }
    };

    return (
        <div className="md__block">
            <div className="md__block-head">
                <span className="md__block-lang">{language || "code"}</span>
                <button type="button" className="md__copy" onClick={copy}>
                    {copied ? <Icons.LuCheck size={12} /> : <Icons.LuCopy size={12} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="md__pre"><code>{code}</code></pre>
        </div>
    );
};

/* ── Block parsing ─────────────────────────────────────────────────────── */

const HEADING = /^(#{1,6})\s+(.*)$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*(\d+)[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

const cells = (row) =>
    row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

/**
 * Splits the source into block descriptors. Kept separate from rendering so
 * the list/table lookahead stays readable — those are the only two blocks
 * that consume more lines than they start with.
 */
const parseBlocks = (source) => {
    const lines = String(source ?? "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            i += 1;
            continue;
        }

        /* Fenced code — everything until the closing fence is verbatim. */
        const fence = line.match(/^\s*```(\w*)/);
        if (fence) {
            const body = [];
            i += 1;
            while (i < lines.length && !/^\s*```/.test(lines[i])) {
                body.push(lines[i]);
                i += 1;
            }
            i += 1; // closing fence
            blocks.push({ type: "code", language: fence[1], text: body.join("\n") });
            continue;
        }

        if (RULE.test(line)) {
            blocks.push({ type: "rule" });
            i += 1;
            continue;
        }

        const heading = line.match(HEADING);
        if (heading) {
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
            i += 1;
            continue;
        }

        /* Table — only when the row after the header is a divider, so a
           sentence containing a pipe isn't mistaken for one. */
        if (line.includes("|") && TABLE_DIVIDER.test(lines[i + 1] || "")) {
            const head = cells(line);
            const rows = [];
            i += 2;
            while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
                rows.push(cells(lines[i]));
                i += 1;
            }
            blocks.push({ type: "table", head, rows });
            continue;
        }

        if (QUOTE.test(line)) {
            const body = [];
            while (i < lines.length && QUOTE.test(lines[i])) {
                body.push(lines[i].match(QUOTE)[1]);
                i += 1;
            }
            blocks.push({ type: "quote", text: body.join(" ") });
            continue;
        }

        if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
            const ordered = OL_ITEM.test(line);
            const items = [];

            while (i < lines.length) {
                const current = lines[i];
                const item = ordered ? current.match(OL_ITEM) : current.match(UL_ITEM);

                if (item) {
                    items.push(ordered ? item[2] : item[1]);
                    i += 1;
                    continue;
                }

                /* An indented continuation line belongs to the item above. */
                if (items.length && /^\s{2,}\S/.test(current) && !UL_ITEM.test(current) && !OL_ITEM.test(current)) {
                    items[items.length - 1] += ` ${current.trim()}`;
                    i += 1;
                    continue;
                }

                break;
            }

            blocks.push({ type: "list", ordered, items });
            continue;
        }

        /* Paragraph — consecutive plain lines join into one. */
        const paragraph = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !HEADING.test(lines[i]) &&
            !UL_ITEM.test(lines[i]) &&
            !OL_ITEM.test(lines[i]) &&
            !QUOTE.test(lines[i]) &&
            !RULE.test(lines[i]) &&
            !/^\s*```/.test(lines[i])
        ) {
            paragraph.push(lines[i].trim());
            i += 1;
        }

        blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    }

    return blocks;
};

/* ── Component ─────────────────────────────────────────────────────────── */

/**
 * Renders a Markdown string as elements.
 *
 * @param {string} children  the Markdown source
 */
const Markdown = ({ children, className = "" }) => {
    const blocks = useMemo(() => parseBlocks(children), [children]);

    if (!blocks.length) return null;

    return (
        <div className={`md ${className}`}>
            {blocks.map((block, index) => {
                const key = `b-${index}`;

                switch (block.type) {
                    case "code":
                        return <CodeBlock key={key} code={block.text} language={block.language} />;

                    case "rule":
                        return <hr key={key} className="md__rule" />;

                    case "heading": {
                        // h1/h2 from a chat reply would out-shout the page's own
                        // title, so the scale starts one level down.
                        const Tag = `h${Math.min(block.level + 2, 6)}`;
                        return (
                            <Tag key={key} className={`md__h md__h--${block.level}`}>
                                {renderInline(block.text, key)}
                            </Tag>
                        );
                    }

                    case "quote":
                        return (
                            <blockquote key={key} className="md__quote">
                                {renderInline(block.text, key)}
                            </blockquote>
                        );

                    case "list": {
                        const Tag = block.ordered ? "ol" : "ul";
                        return (
                            <Tag key={key} className={`md__list md__list--${block.ordered ? "ol" : "ul"}`}>
                                {block.items.map((item, n) => (
                                    <li key={n}>{renderInline(item, `${key}-${n}`)}</li>
                                ))}
                            </Tag>
                        );
                    }

                    case "table":
                        return (
                            <div key={key} className="md__table-wrap">
                                <table className="md__table">
                                    <thead>
                                        <tr>
                                            {block.head.map((cell, n) => (
                                                <th key={n}>{renderInline(cell, `${key}-h${n}`)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {block.rows.map((row, r) => (
                                            <tr key={r}>
                                                {row.map((cell, c) => (
                                                    <td key={c}>{renderInline(cell, `${key}-${r}${c}`)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );

                    default:
                        return (
                            <p key={key} className="md__p">
                                {renderInline(block.text, key)}
                            </p>
                        );
                }
            })}
        </div>
    );
};

export default Markdown;
