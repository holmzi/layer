import { reveal } from "./range.js";

export function open_selector(editor, selector) {
    const sheet = new CSSStyleSheet();
    function normalize(text) {
        try {
            sheet.insertRule(text + " {}");
            const normalized = sheet.cssRules[0].selectorText;
            sheet.deleteRule(0);
            return normalized;
        } catch {
            return null;
        }
    }

    const wanted = normalize(selector);
    if (!wanted) return;
    const source = editor.value;
    let start = 0;
    let depth = 0;
    let caret = -1;
    for (const { type, at } of css_separators(source, "{};")) {
        if (type === "{") {
            if (!depth && normalize(source.slice(start, at)) === wanted) {
                const body = source.slice(at + 1);
                caret = at + 1 + body.match(/^[ \t]*(?:\n[ \t]*)?/)[0].length;
                break;
            }
            depth++;
        } else if (type === "}") {
            depth = Math.max(0, depth - 1);
        }
        if (!depth) start = at + 1;
    }

    if (caret === -1) {
        const separator = !source || source.endsWith("\n\n") ? "" : source.endsWith("\n") ? "\n" : "\n\n";
        const prefix = separator + selector + " {\n    ";
        editor.setRangeText(prefix + "\n}", source.length, source.length);
        caret = source.length + prefix.length;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
    reveal(editor, caret);
}
