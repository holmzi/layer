"use strict";

const scopes = document.querySelector("#scopes");
const enabled = document.querySelector("#enabled");
const editor = document.querySelector("#editor");
const editorContent = document.querySelector(".editor-content");
const syntaxContent = document.querySelector("#syntax-content");
const lineNumberContent = document.querySelector("#line-number-content");
const errorText = document.querySelector("#error");
const syntaxTokenPattern = /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"?|'(?:\\[\s\S]|[^'\\])*'?|@[a-zA-Z_-][\w-]*/g;
let displayedLineCount = 0;

function syncEditorScroll() {
    const scrollTop = -editor.scrollTop;
    lineNumberContent.style.transform = `translateY(${scrollTop}px)`;
    syntaxContent.style.transform = `translate(${-editor.scrollLeft}px, ${scrollTop}px)`;
}

function updateLineNumbers() {
    const lineCount = editor.value.split("\n").length;
    if (lineCount !== displayedLineCount) {
        lineNumberContent.textContent = Array.from(
            { length: lineCount },
            (_, index) => index + 1,
        ).join("\n");
        displayedLineCount = lineCount;
    }
}

function appendToken(parent, text, type) {
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

function appendHighlightedText(parent, text, type) {
    let start = 0;
    for (const match of text.matchAll(syntaxTokenPattern)) {
        appendToken(parent, text.slice(start, match.index), type);
        const token = match[0];
        const tokenType = token.startsWith("/*") ? "comment"
            : token.startsWith("@") ? "at-rule" : "string";
        appendToken(parent, token, tokenType);
        start = match.index + token.length;
    }
    appendToken(parent, text.slice(start), type);
}

function scanSeparators(text, separators, callback) {
    let quote = "";
    let comment = false;
    let parentheses = 0;
    let brackets = 0;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        const next = text[index + 1];

        if (comment) {
            if (char === "*" && next === "/") {
                comment = false;
                index++;
            }
            continue;
        }
        if (quote) {
            if (char === "\\") index++;
            else if (char === quote) quote = "";
            continue;
        }
        switch (char) {
            case "/":
                if (next !== "*") break;
                comment = true;
                index++;
                continue;
            case "\\":
                index++;
                continue;
            case "\"":
            case "'":
                quote = char;
                continue;
            case "(":
                parentheses++;
                continue;
            case ")":
                parentheses = Math.max(0, parentheses - 1);
                continue;
            case "[":
                brackets++;
                continue;
            case "]":
                brackets = Math.max(0, brackets - 1);
                continue;
        }

        if (!parentheses && !brackets && separators.includes(char)) {
            if (callback(char, index) === false) return;
        }
    }
}

function appendStatement(parent, text, declaration) {
    let colon = -1;
    if (declaration) {
        scanSeparators(text, ":", (_, index) => {
            colon = index;
            return false;
        });
    }
    if (colon === -1) {
        appendHighlightedText(parent, text, declaration ? "property" : "selector");
        return;
    }

    appendHighlightedText(parent, text.slice(0, colon), "property");
    appendToken(parent, ":");
    appendHighlightedText(parent, text.slice(colon + 1), "value");
}

function updateSyntaxHighlighting() {
    const source = editor.value;
    const fragment = document.createDocumentFragment();
    let start = 0;
    let depth = 0;

    scanSeparators(source, "{};", (separator, index) => {
        appendStatement(fragment, source.slice(start, index), separator !== "{" && depth > 0);
        appendToken(fragment, separator);
        if (separator === "{") depth++;
        else if (separator === "}") depth = Math.max(0, depth - 1);
        start = index + 1;
    });
    appendStatement(fragment, source.slice(start), depth > 0);
    syntaxContent.replaceChildren(fragment);
    editorContent.classList.add("highlight-ready");
}

function updateEditor() {
    updateLineNumbers();
    updateSyntaxHighlighting();
    syncEditorScroll();
}

function showError(message) {
    errorText.textContent = message;
    errorText.hidden = !message;
}

async function activeHostname() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) return "";

    try {
        return await chrome.tabs.sendMessage(tab.id, { type: "hostname" }, { frameId: 0 });
    } catch {
        return "";
    }
}

async function openEditor() {
    const url = new URL(location.href);
    const expanded = url.searchParams.has("hostname");
    document.body.classList.toggle("expanded", expanded);
    const expand = document.querySelector("#expand");
    expand.hidden = expanded;
    const hostname = expanded ? url.searchParams.get("hostname") : await activeHostname();
    const global = styleKeys();
    const site = hostname ? styleKeys(hostname) : null;
    const defaults = styleDefaults(site ? [global, site] : [global]);
    const errors = {};
    const values = { ...defaults };
    const pending = new Map();
    const received = {};
    let ready = false;
    let current = url.searchParams.get("scope") === "global" ? global : site ?? global;

    if (expanded) {
        const title = document.createElement("span");
        title.textContent = current === global ? "Global" : hostname;
        document.querySelector("header").replaceChildren(title);
        document.title = `${title.textContent} · Layer`;
    }

    function updateValue(key, value) {
        values[key] = value;
        if (!ready) {
            received[key] = value;
            return;
        }
        if (current.css === key && editor.value !== value) {
            editor.value = value;
            updateEditor();
        }
        if (current.enabled === key) enabled.checked = value;
    }

    chrome.storage.local.onChanged.addListener((changes) => {
        for (const [key, change] of Object.entries(changes)) {
            if (Object.hasOwn(defaults, key) && !pending.has(key)) {
                updateValue(key, change.newValue ?? defaults[key]);
            }
        }
    });
    Object.assign(values, await chrome.storage.local.get(defaults), received);
    ready = true;

    function showSaveError() {
        showError(errors[current.css] || errors[current.enabled] || "");
    }

    function render() {
        editor.value = values[current.css];
        updateEditor();
        enabled.checked = values[current.enabled];
        const name = current === global ? "Global" : hostname;
        editor.setAttribute("aria-label", `${name} CSS`);
        enabled.setAttribute("aria-label", `Enable ${name} CSS`);
        showSaveError();
    }

    async function save(key, value) {
        values[key] = value;
        const write = chrome.storage.local.set({ [key]: value });
        pending.set(key, write);
        let message = "";
        try {
            await write;
        } catch (error) {
            message = `Could not save changes. ${error.message}`;
        }
        if (pending.get(key) !== write) return;
        errors[key] = message;
        pending.delete(key);
        showSaveError();
    }

    expand.disabled = false;
    expand.addEventListener("click", async () => {
        url.searchParams.set("hostname", hostname);
        url.searchParams.set("scope", current === global ? "global" : "site");
        try {
            await chrome.tabs.create({ url: url.href });
        } catch (error) {
            showError(error.message);
        }
    });

    if (!expanded && site) {
        const siteInput = document.querySelector("#site");
        const label = document.querySelector("#hostname");
        label.textContent = hostname;
        label.title = hostname;
        siteInput.disabled = false;
        siteInput.checked = current === site;
    }

    render();
    scopes.disabled = false;
    enabled.disabled = false;
    editor.disabled = false;
    enableCodeEditing(editor);
    editor.focus();

    scopes.addEventListener("change", (event) => {
        current = event.target.value === "site" ? site : global;
        render();
    });
    editor.addEventListener("input", () => {
        updateEditor();
        save(current.css, editor.value);
    });
    editor.addEventListener("scroll", syncEditorScroll);
    enabled.addEventListener("change", () => save(current.enabled, enabled.checked));
}

openEditor().catch((error) => showError(`Could not open the editor. ${error.message}`));
