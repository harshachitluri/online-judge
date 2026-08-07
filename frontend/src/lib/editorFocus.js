/*
 |==========================================================================
 | Editor focus tracking
 |==========================================================================
 | Global keyboard shortcuts must not fire while someone is typing code.
 | For a normal <input> or <textarea> that check is easy — look at the event
 | target's tag name. Monaco defeats that:
 |
 |   · its real input surface is a hidden helper element whose tag and class
 |     have changed between Monaco versions (it was `textarea.inputarea`,
 |     it is now `textarea.ime-text-area`), and
 |   · the keydown that reaches a window-level listener reports `body` as
 |     its target anyway, so `closest(".monaco-editor")` can't help either —
 |     body is the editor's *ancestor*, not its descendant.
 |
 | The consequence was that pressing "/" inside the editor opened the
 | command palette instead of typing a slash, which broke comments,
 | division and `#include <bits/stdc++.h>`.
 |
 | Rather than pattern-match on Monaco's DOM — the thing that already broke
 | once when Monaco changed — this asks Monaco directly. The Forge subscribes
 | to the editor's own focus/blur events and reports here; useHotkey reads it.
 |
 | Deliberately a module-level flag rather than context: useHotkey needs the
 | value inside a native event listener, where a re-render-driven context
 | value would be stale.
 */

let focusedEditors = 0;

/** Called from Monaco's onDidFocusEditorText / onDidBlurEditorText. */
export const setEditorFocused = (focused) => {
    // Counted, not boolean: the Forge can hold more than one editor, and a
    // blur from one arriving after a focus on another must not clear the flag.
    focusedEditors = Math.max(0, focusedEditors + (focused ? 1 : -1));
};

/** True while any code editor holds the caret. */
export const isEditorFocused = () => focusedEditors > 0;

/** Unmount safety: a torn-down editor never sends its blur. */
export const resetEditorFocus = () => {
    focusedEditors = 0;
};
