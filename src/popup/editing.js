"use strict";

function enableCodeEditing(editor) {
    const indent = "    ";
    const pairs = new Map([["{", "}"], ["(", ")"], ["[", "]"], ['"', '"'], ["'", "'"]]);
    const closers = new Set(pairs.values());

    let editing = false;

    function replace(start, end, text, from = start + text.length, to = from) {
        const direction = editor.selectionDirection;
        editor.setSelectionRange(start, end);
        let edited;
        editing = true;
        try {
            edited = text
                ? document.execCommand("insertText", false, text)
                : document.execCommand("delete");
        } finally {
            editing = false;
        }
        if (!edited) {
            editor.setRangeText(text, start, end);
            editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
        editor.setSelectionRange(from, to, direction);
    }

    function lineStart(text, pos) {
        return text.slice(0, pos).lastIndexOf("\n") + 1;
    }

    function lineEnd(text, pos) {
        const end = text.indexOf("\n", pos);
        return end < 0 ? text.length : end;
    }

    function indentLines(outdent) {
        const { value, selectionStart: start, selectionEnd: end } = editor;
        const first = lineStart(value, start);
        if (!outdent && start === end) {
            replace(start, end, indent);
            return;
        }

        const last = lineEnd(value, Math.max(start, end - 1));
        const lines = value.slice(first, last).split("\n");
        let pos = first;
        let from = start;
        let to = end;
        const result = lines.map((line) => {
            const remove = outdent ? line.match(/^(?:\t| {0,4})/)[0].length : 0;
            const prefix = outdent ? "" : indent;
            if (start >= pos) from += prefix.length - Math.min(remove, start - pos);
            if (end >= pos) to += prefix.length - Math.min(remove, end - pos);
            pos += line.length + 1;
            return prefix + line.slice(remove);
        }).join("\n");
        if (result !== value.slice(first, last)) replace(first, last, result, from, to);
    }

    function toggleComment() {
        const { value, selectionStart, selectionEnd } = editor;
        const selected = selectionStart !== selectionEnd;
        let start = selected ? selectionStart : lineStart(value, selectionStart);
        const end = selected ? selectionEnd : lineEnd(value, selectionEnd);
        if (!selected) start += value.slice(start, end).match(/^[ \t]*/)[0].length;
        const text = value.slice(start, end);
        const comment = /^\/\* ?([\s\S]*?) ?\*\/([ \t]*)$/.exec(text);
        let replacement;
        if (comment && !comment[1].includes("*/")) {
            replacement = comment[1] + comment[2];
        } else {
            if (text.includes("*/")) return;
            replacement = "/* " + text + " */";
        }
        if (selected) replace(start, end, replacement, start, start + replacement.length);
        else replace(start, end, replacement, start + (comment ? 0 : 3));
    }

    function contextBefore(text) {
        let quote = "";
        let comment = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (comment) {
                if (char === "*" && text[i + 1] === "/") {
                    comment = false;
                    i++;
                }
            } else if (char === "\\") {
                if (++i === text.length) return "escape";
            } else if (quote) {
                if (char === quote || char === "\n") quote = "";
            } else if (char === "/" && text[i + 1] === "*") {
                comment = true;
                i++;
            } else if (char === '"' || char === "'") {
                quote = char;
            }
        }
        return comment ? "comment" : quote;
    }

    editor.addEventListener("keydown", (event) => {
        if (event.isComposing || event.keyCode === 229 || event.altKey) return;
        if (event.ctrlKey || event.metaKey) {
            if (event.code === "Slash" || event.key === "/") {
                event.preventDefault();
                toggleComment();
            }
            return;
        }
        if (event.key === "Escape") {
            editor.blur();
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            indentLines(event.shiftKey);
            return;
        }

        const { value, selectionStart: start, selectionEnd: end } = editor;
        const before = value.slice(0, start);
        if (event.key === "Enter") {
            const line = before.slice(lineStart(value, start));
            const base = line.match(/^[ \t]*/)[0];
            const open = line.trimEnd().slice(-1);
            const nested = ["{", "[", "("].includes(open) && !contextBefore(before);
            const newline = "\n" + base + (nested ? indent : "");
            const split = nested && pairs.get(open) === value[end];
            event.preventDefault();
            replace(start, end, newline + (split ? "\n" + base : ""), start + newline.length);
            return;
        }
        if (event.key === "Backspace" && start === end && start > 0 &&
            pairs.has(value[start - 1]) && pairs.get(value[start - 1]) === value[start] &&
            !contextBefore(value.slice(0, start - 1))) {
            event.preventDefault();
            replace(start - 1, start + 1, "");
        }
    });

    editor.addEventListener("beforeinput", (event) => {
        const char = event.data;
        if (editing || event.isComposing || !event.cancelable || event.inputType !== "insertText" ||
            (!pairs.has(char) && !closers.has(char))) return;
        const { value, selectionStart: start, selectionEnd: end } = editor;
        const context = contextBefore(value.slice(0, start));
        if (context && context !== char) return;
        if (start === end && value[start] === char && closers.has(char)) {
            event.preventDefault();
            editor.setSelectionRange(start + 1, start + 1);
        } else if (!context && pairs.has(char)) {
            event.preventDefault();
            replace(start, end, char + value.slice(start, end) + pairs.get(char), start + 1, end + 1);
        }
    });
}
