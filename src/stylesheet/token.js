"use strict";

function* css_tokens(source, report) {
    const escape = /\\(?:[0-9a-f]{1,6}(?:\r\n|[ \t\r\n\f])?|[^\r\n\f])/iy;
    const name = /(?:[-_a-z0-9\u0080-\uFFFF]|\\(?:[0-9a-f]{1,6}(?:\r\n|[ \t\r\n\f])?|[^\r\n\f]))+/iy;
    const space = /[ \t\r\n\f]/;

    function escape_end(at) {
        escape.lastIndex = at;
        if (escape.test(source)) return escape.lastIndex;
        return Math.min(source.length, at + (source.startsWith("\\\r\n", at) ? 3 : 2));
    }

    let end = 0;
    while (end < source.length) {
        const at = end++;
        const char = source[at];
        if (space.test(char)) continue;

        if (source.startsWith("/*", at)) {
            const close = source.indexOf("*/", end + 1);
            if (close < 0) {
                report?.(at, at + 2, "Unclosed comment");
                return;
            }
            end = close + 2;
            continue;
        }

        if (char === "'" || char === '"') {
            while (end < source.length && source[end] !== char && !/[\r\n\f]/.test(source[end])) {
                end = source[end] === "\\" ? escape_end(end) : end + 1;
            }
            if (source[end] === char) end++;
            else report?.(at, at + 1, "Unclosed string");
            yield { type: "value", at, end };
            continue;
        }

        name.lastIndex = at;
        const match = name.exec(source);
        if (!match) {
            yield { type: char, at, end };
            continue;
        }
        end = name.lastIndex;
        const text = match[0].replace(/\\([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|\\([^\r\n\f])/gi,
            (_, hex, literal) => {
                if (!hex) return literal;
                const code = parseInt(hex, 16);
                return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "\uFFFD";
            });
        if (text.toLowerCase() === "url" && source[end] === "(") {
            let pos = end + 1;
            while (pos < source.length && space.test(source[pos])) pos++;
            if (source[pos] !== "'" && source[pos] !== '"') {
                while (pos < source.length && source[pos] !== ")") {
                    pos = source[pos] === "\\" ? escape_end(pos) : pos + 1;
                }
                if (pos === source.length) report?.(end, end + 1, "Missing )");
                end = Math.min(pos + 1, source.length);
                yield { type: "value", at, end };
                continue;
            }
        }
        yield { type: "name", text, at, end };
    }
}

function* css_separators(text, separators) {
    let parentheses = 0;
    let brackets = 0;
    for (const token of css_tokens(text)) {
        switch (token.type) {
            case "(": parentheses++; break;
            case ")": parentheses = Math.max(0, parentheses - 1); break;
            case "[": brackets++; break;
            case "]": brackets = Math.max(0, brackets - 1); break;
            default:
                if (!parentheses && !brackets && separators.includes(token.type)) yield token;
        }
    }
}
