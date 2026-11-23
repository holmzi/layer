"use strict";

function is_custom_property(statement) {
    return statement[0]?.text?.startsWith("--") && statement[1]?.type === ":";
}

function describe_block(token, statement, parent) {
    const rule = statement[0]?.type !== "@";
    const name = rule ? "" : statement[1]?.text?.toLowerCase();
    const grouping = ["media", "supports", "container", "layer", "scope", "starting-style", "document"].includes(name);
    const descriptor = ["font-face", "property", "counter-style", "page"].includes(name);
    const excluded = parent?.excluded || name === "keyframes" || name === "-webkit-keyframes";
    return {
        at: token.at,
        declarations: rule || descriptor || (grouping && parent?.declarations),
        priority: !excluded && (rule || (grouping && parent?.priority)),
        excluded,
    };
}

function parse_css(source, { report, prioritize, lexical_error = report }) {
    const pairs = { "(": ")", "[": "]", "{": "}" };
    const blocks = [];
    const groups = [];
    let statement = [];

    for (const token of css_tokens(source, lexical_error)) {
        const type = token.type;
        if (type === "(" || type === "[" || (type === "{" && (groups.length || is_custom_property(statement)))) {
            groups.push({ at: token.at, close: pairs[type] });
        } else if (groups.length) {
            const group = groups.at(-1);
            if (type === group.close) {
                groups.pop();
                if (!groups.length) statement.push({ type: "value", at: group.at, end: token.end });
            } else if ([")", "]", "}"].includes(type)) {
                report?.(token.at, token.end, "Unexpected " + type);
            }
        } else if (type === "{") {
            blocks.push(describe_block(token, statement, blocks.at(-1)));
            statement = [];
        } else if (type === ";" || type === "}") {
            inspect_declaration(statement, blocks.at(-1), report, prioritize);
            if (type === "}" && !blocks.pop()) report?.(token.at, token.end, "Unexpected }");
            statement = [];
        } else if (type === ")" || type === "]") {
            report?.(token.at, token.end, "Unexpected " + type);
        } else {
            statement.push(token);
        }
    }
    const block = blocks.at(-1);
    if (!groups.length) inspect_declaration(statement, block, report, prioritize);
    for (const group of groups) report?.(group.at, group.at + 1, "Missing " + group.close);
    for (const open of blocks) report?.(open.at, open.at + 1, "Missing }");
    return !groups.length && block?.declarations ? statement : null;
}

function inspect_declaration(statement, block, report, prioritize) {
    if (!block?.declarations || (!report && !prioritize)) return;
    const [property, colon] = statement;
    if (!property || property.type === "@") return;
    if (property.type !== "name" || colon?.type !== ":") {
        report?.(property.at, property.end, "Expected a colon after the property");
        return;
    }

    const last = statement.at(-1);
    const important = last.text?.toLowerCase() === "important" && statement.at(-2)?.type === "!";
    if (!is_custom_property(statement)) {
        if (statement.length === 2 || (important && statement.length === 4)) {
            report?.(property.at, property.end, "Expected a property value");
            return;
        }
        for (let i = 2; i + 1 < statement.length; i++) {
            const token = statement[i];
            if (token.type === "name" && statement[i + 1].type === ":") {
                report?.(token.at, token.end, "Expected a semicolon before this property");
                return;
            }
        }
    }
    if (block.priority && !important) prioritize?.(last.end);
}

function find_css_errors(source) {
    const issues = [];
    const report = (at, end, message) => issues.push({ at, end, message });
    parse_css(source, { report });
    return issues.sort((a, b) => a.at - b.at);
}

function apply_priority(source) {
    let css = "";
    let from = 0;
    function insert(end) {
        css += source.slice(from, end) + " !important";
        from = end;
    }
    parse_css(source, { prioritize: insert });
    return css + source.slice(from);
}

function declaration_at(source, caret) {
    let incomplete = false;
    const statement = parse_css(source.slice(0, caret), {
        lexical_error() { incomplete = true; },
    });
    return incomplete ? null : statement;
}
