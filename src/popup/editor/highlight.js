const TOKEN_PATTERN = /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"?|'(?:\\[\s\S]|[^'\\])*'?|@[a-zA-Z_-][\w-]*/g;

function append_token(parent, text, type) {
    if (!text) return;
    if (!type) {
        parent.append(document.createTextNode(text));
        return;
    }

    const token = document.createElement("span");
    token.className = `syntax-${type}`;
    token.textContent = text;
    parent.append(token);
}

function append_highlighted_text(parent, text, type) {
    let start = 0;
    for (const match of text.matchAll(TOKEN_PATTERN)) {
        append_token(parent, text.slice(start, match.index), type);
        const token = match[0];
        const token_type = token.startsWith("/*") ? "comment"
            : token.startsWith("@") ? "at-rule" : "string";
        append_token(parent, token, token_type);
        start = match.index + token.length;
    }
    append_token(parent, text.slice(start), type);
}

export function highlight(source) {
    const fragment = document.createDocumentFragment();
    let start = 0;
    let colon = -1;
    let depth = 0;

    function append_statement(end, declaration) {
        if (declaration && colon >= 0) {
            append_highlighted_text(fragment, source.slice(start, colon), "property");
            append_token(fragment, ":");
            append_highlighted_text(fragment, source.slice(colon + 1, end), "value");
        } else {
            append_highlighted_text(fragment, source.slice(start, end), declaration ? "property" : "selector");
        }
    }

    for (const { type, at } of css_separators(source, "{};:")) {
        if (type === ":") {
            if (colon < 0) colon = at;
            continue;
        }
        append_statement(at, type !== "{" && depth > 0);
        append_token(fragment, type);
        if (type === "{") depth++;
        else if (type === "}") depth = Math.max(0, depth - 1);
        start = at + 1;
        colon = -1;
    }
    append_statement(source.length, depth > 0);
    return fragment;
}
