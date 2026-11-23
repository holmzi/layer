export const indent = "    ";

export function bind_input(editor) {
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

    function context_before(text) {
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
        if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key !== "Enter" && event.key !== "Backspace") return;
        const { value, selectionStart: start, selectionEnd: end } = editor;
        const before = value.slice(0, start);
        if (event.key === "Enter") {
            const line = before.slice(before.lastIndexOf("\n") + 1);
            const base = line.match(/^[ \t]*/)[0];
            const open = line.trimEnd().slice(-1);
            const nested = ["{", "[", "("].includes(open) && !context_before(before);
            const newline = "\n" + base + (nested ? indent : "");
            const split = nested && pairs.get(open) === value[end];
            event.preventDefault();
            replace(start, end, newline + (split ? "\n" + base : ""), start + newline.length);
            return;
        }
        const left = value[start - 1];
        if (start === end && pairs.has(left) && pairs.get(left) === value[start] &&
            !context_before(value.slice(0, start - 1))) {
            event.preventDefault();
            replace(start - 1, start + 1, "");
        }
    });

    editor.addEventListener("beforeinput", (event) => {
        const char = event.data;
        if (editing || event.isComposing || !event.cancelable || event.inputType !== "insertText" ||
            (!pairs.has(char) && !closers.has(char))) return;
        const { value, selectionStart: start, selectionEnd: end } = editor;
        const context = context_before(value.slice(0, start));
        if (context && context !== char) return;
        if (start === end && value[start] === char && closers.has(char)) {
            event.preventDefault();
            editor.setSelectionRange(start + 1, start + 1);
        } else if (!context && pairs.has(char)) {
            event.preventDefault();
            replace(start, end, char + value.slice(start, end) + pairs.get(char), start + 1, end + 1);
        }
    });
    return replace;
}
