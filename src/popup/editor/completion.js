import { create_range_reader } from "./range.js";

const SHORTHANDS = `
    all animation background background-position border border-block border-inline border-color
    border-radius border-style border-width border-top border-right border-bottom border-left
    columns column-rule container flex flex-flow font gap grid grid-area grid-column grid-row
    grid-template inset inset-block inset-inline list-style margin margin-block margin-inline mask
    offset outline overflow overscroll-behavior padding padding-block padding-inline place-content
    place-items place-self scroll-margin scroll-padding text-decoration text-emphasis text-wrap
    transition white-space
`.trim().split(/\s+/);

const KEYWORDS = `
    auto none normal block inline inline-block flex inline-flex grid inline-grid contents flow-root
    list-item table table-row table-cell static relative absolute fixed sticky hidden visible clip
    scroll overlay row row-reverse column column-reverse wrap nowrap wrap-reverse start end
    flex-start flex-end center stretch baseline space-between space-around space-evenly left
    right top bottom justify middle solid dotted dashed double groove ridge inset outset border-box
    content-box padding-box cover contain repeat no-repeat repeat-x repeat-y round space
    pointer default text move grab grabbing crosshair not-allowed bold bolder lighter italic
    oblique underline overline line-through ellipsis uppercase lowercase capitalize pre pre-wrap
    pre-line break-spaces break-word break-all keep-all anywhere horizontal vertical both
    ease ease-in ease-out ease-in-out linear infinite alternate forwards backwards running paused
    transparent currentColor black white red green blue serif sans-serif monospace system-ui
    min-content max-content fit-content inherit initial unset revert revert-layer
`.trim().split(/\s+/);

export function bind_completion(editor, replace) {
    const menu = document.getElementById("completion");
    const content = document.getElementById("syntax-content");
    const properties = [...new Set([...Array.from(getComputedStyle(document.documentElement)), ...SHORTHANDS])]
        .filter(name => !name.startsWith("--") && CSS.supports(name, "initial")).sort();
    const values = new Map();
    let state;
    let selected = 0;
    let accepting = false;

    function close() {
        menu.hidden = true;
        editor.removeAttribute("aria-activedescendant");
        state = null;
    }

    function select(index) {
        selected = (index + state.items.length) % state.items.length;
        for (let i = 0; i < menu.children.length; i++) {
            menu.children[i].setAttribute("aria-selected", String(i === selected));
        }
        const item = menu.children[selected];
        editor.setAttribute("aria-activedescendant", item.id);
        if (item.offsetTop < menu.scrollTop) menu.scrollTop = item.offsetTop;
        else if (item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight) {
            menu.scrollTop = item.offsetTop + item.offsetHeight - menu.clientHeight;
        }
    }

    function suggest() {
        close();
        const source = editor.value;
        const caret = editor.selectionStart;
        if (document.activeElement !== editor || editor.selectionEnd !== caret) return;
        const prefix = source.slice(0, caret).match(/[-a-z0-9]*$/i)[0];
        const start = caret - prefix.length;
        const words = declaration_at(source, start);
        if (!words) return;
        const property = words.length === 0;
        if (property && !prefix) return;
        let candidates = properties;
        if (!property) {
            if (words[0]?.type !== "name" || words[1]?.type !== ":" || words[0].text.startsWith("--")) return;
            if (words.length > 2 && !/\s/.test(source[start - 1])) return;
            const name = words[0].text.toLowerCase();
            if (!values.has(name)) values.set(name, KEYWORDS.filter(word => CSS.supports(name, word)));
            candidates = values.get(name);
        }
        const query = prefix.toLowerCase();
        const items = candidates.filter(item => item.toLowerCase().startsWith(query));
        if (!items.length) return;
        const end = caret + source.slice(caret).match(/^[-a-z0-9]*/i)[0].length;
        const read_range = create_range_reader(content);
        const range = read_range(caret);
        if (!range) return;
        state = { source, caret, start, end, property, items, range };
        menu.replaceChildren(...items.map((text, index) => {
            const item = document.createElement("div");
            item.id = "completion-" + index;
            item.setAttribute("role", "option");
            item.textContent = text;
            return item;
        }));
        menu.hidden = false;
        position();
        if (state) select(0);
    }

    function position() {
        if (!state) return;
        const rect = state.range.getBoundingClientRect();
        const bounds = editor.getBoundingClientRect();
        if (!rect.height || rect.bottom <= bounds.top || rect.top >= bounds.bottom ||
            rect.left < bounds.left || rect.left > bounds.right) {
            close();
            return;
        }
        menu.style.left = Math.max(bounds.left, Math.min(rect.left, bounds.right - menu.offsetWidth)) + "px";
        const y = rect.bottom + menu.offsetHeight <= bounds.bottom ? rect.bottom : rect.top - menu.offsetHeight;
        menu.style.top = Math.max(bounds.top, y) + "px";
    }

    function accept() {
        if (!state || state.source !== editor.value || editor.selectionStart !== state.caret ||
            editor.selectionEnd !== state.caret) {
            close();
            return;
        }
        const { source, start, property, items } = state;
        let end = state.end;
        let text = items[selected];
        if (property) {
            const colon = source.slice(end).match(/^[ \t]*:[ \t]*/);
            if (colon) end += colon[0].length;
            text += ": ";
        }
        close();
        accepting = true;
        try {
            replace(start, end, text);
        } finally {
            accepting = false;
        }
        if (property) suggest();
    }

    editor.addEventListener("input", event => {
        if (accepting || event.isComposing || !["insertText", "deleteContentBackward"].includes(event.inputType)) close();
        else suggest();
    });
    editor.addEventListener("keydown", event => {
        if (!state) return;
        if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
            close();
            return;
        }
        if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) {
            close();
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") close();
        else if (event.key === "ArrowDown") select(selected + 1);
        else if (event.key === "ArrowUp") select(selected - 1);
        else accept();
    }, true);
    menu.addEventListener("mousedown", event => event.preventDefault());
    menu.addEventListener("click", event => {
        const index = Array.prototype.indexOf.call(menu.children, event.target);
        if (state && index >= 0) {
            select(index);
            accept();
        }
    });
    editor.addEventListener("blur", close);
    editor.addEventListener("pointerdown", close);
    editor.addEventListener("scroll", position);
    new ResizeObserver(position).observe(editor);
    window.addEventListener("resize", position);
    return close;
}
