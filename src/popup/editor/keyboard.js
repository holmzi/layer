import { bind_input, indent } from "./input.js";

export function bind_keys(editor) {
    const replace = bind_input(editor);

    function line_start(text, pos) {
        return pos > 0 ? text.lastIndexOf("\n", pos - 1) + 1 : 0;
    }

    function line_end(text, pos) {
        const end = text.indexOf("\n", pos);
        return end < 0 ? text.length : end;
    }

    function selected_lines() {
        const { value, selectionStart: start, selectionEnd: end } = editor;
        const first = line_start(value, start);
        const last = line_end(value, Math.max(start, end - 1));
        return { value, start, end, first, last };
    }

    function indent_lines(outdent) {
        const { value, start, end, first, last } = selected_lines();
        if (!outdent && start === end) {
            replace(start, end, indent);
            return;
        }

        const lines = value.slice(first, last).split("\n");
        let pos = first;
        let from = start;
        let to = end;
        const prefix = outdent ? "" : indent;
        const result = lines.map((line) => {
            const remove = outdent ? line.match(/^(?:\t| {0,4})/)[0].length : 0;
            if (start >= pos) from += prefix.length - Math.min(remove, start - pos);
            if (end >= pos) to += prefix.length - Math.min(remove, end - pos);
            pos += line.length + 1;
            return prefix + line.slice(remove);
        }).join("\n");
        if (result !== value.slice(first, last)) replace(first, last, result, from, to);
    }

    function toggle_comment() {
        const { value, selectionStart, selectionEnd } = editor;
        const selected = selectionStart !== selectionEnd;
        let start = selected ? selectionStart : line_start(value, selectionStart);
        const end = selected ? selectionEnd : line_end(value, selectionEnd);
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

    function edit_lines(up, duplicate) {
        const { value, start, end, first, last } = selected_lines();
        const block = value.slice(first, last);
        let shift;
        if (duplicate) {
            shift = up ? 0 : block.length + 1;
            replace(first, last, block + "\n" + block, start + shift, end + shift);
        } else if (up && first > 0) {
            const before = line_start(value, first - 1);
            shift = before - first;
            replace(before, last, block + "\n" + value.slice(before, first - 1), start + shift, end + shift);
        } else if (!up && last < value.length) {
            const after = line_end(value, last + 1);
            shift = after - last;
            replace(first, after, value.slice(last + 1, after) + "\n" + block, start + shift, end + shift);
        }
    }

    function insert_line(above) {
        const { value, selectionStart, selectionEnd } = editor;
        const pos = above ? line_start(value, selectionStart) : line_end(value, selectionEnd);
        const line = value.slice(line_start(value, pos), line_end(value, pos));
        let padding = line.match(/^[ \t]*/)[0];
        if (!above && line.trimEnd().endsWith("{")) padding += indent;
        replace(pos, pos, above ? padding + "\n" : "\n" + padding, pos + padding.length + Number(!above));
    }

    function delete_lines() {
        const { value, first, last } = selected_lines();
        if (!value) return;
        if (last < value.length) replace(first, last + 1, "");
        else replace(Math.max(0, first - 1), last, "");
    }

    editor.addEventListener("keydown", (event) => {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.altKey) {
            const arrow = event.key === "ArrowUp" || event.key === "ArrowDown";
            if (arrow && !event.metaKey && (!event.ctrlKey || event.shiftKey)) {
                event.preventDefault();
                edit_lines(event.key === "ArrowUp", event.shiftKey);
            }
            return;
        }
        if (event.ctrlKey || event.metaKey) {
            if (event.key === "Enter") {
                event.preventDefault();
                insert_line(event.shiftKey);
                return;
            }
            if (event.shiftKey && event.code === "KeyK") {
                event.preventDefault();
                delete_lines();
                return;
            }
            if (event.code === "Slash" || event.key === "/") {
                event.preventDefault();
                toggle_comment();
            }
            return;
        }
        if (event.key === "Escape") {
            editor.blur();
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            indent_lines(event.shiftKey);
        }
    });
    return replace;
}
