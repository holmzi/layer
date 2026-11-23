import { editor, bind_editor, set_text } from "./editor/index.js";
import { take_selection } from "../picker/session.js";
import { open_selector } from "./editor/selector.js";
import { active_hostname } from "./hostname.js";
import { control, show_error } from "./dom.js";
import { bind_library } from "./library.js";
import { bind_toolbar } from "./toolbar.js";

async function open_editor() {
    const url = new URL(location.href);
    const expanded = url.searchParams.has("hostname");
    const [tab] = expanded ? [] : await chrome.tabs.query({ active: true, currentWindow: true });
    const source = expanded ? url.searchParams.get("hostname") : await active_hostname(tab);
    let host = expanded && url.searchParams.get("scope") === "global" ? "" : source;
    const available = expanded || Boolean(host);
    const enabled = control("enabled");
    const errors = { css: new Map(), enabled: new Map() };
    let saved = false;
    let refresh_library;
    let styles;

    document.body.classList.toggle("expanded", expanded);
    control("hostname").textContent = source || "No active site";
    control("hostname").hidden = expanded;
    control("choose").hidden = !expanded;

    function render() {
        set_text(available ? styles.get_css(host) : "");
        enabled.checked = available && styles.is_enabled(host);
        saved = styles.has(host);
        control("remove").hidden = !expanded || !host || !saved;
        refresh_library?.();
    }

    function select(hostname) {
        host = hostname;
        const name = host || "Global";
        if (expanded) {
            url.searchParams.set("hostname", host);
            url.searchParams.delete("scope");
            history.replaceState(null, "", url);
            document.title = `${name} · Layer`;
            control("style-name").textContent = name;
        }
        control("open-site").hidden = !expanded || !host;
        enabled.setAttribute("aria-label", `Enable ${name} CSS`);
        editor.setAttribute("aria-label", `${name} CSS`);
        render();
        display_error();
    }

    function display_error() {
        show_error(errors.css.get(host) || errors.enabled.get(host) || "");
    }

    async function save(field, write) {
        const hostname = host;
        try {
            if (!await write) return;
            errors[field].delete(hostname);
        } catch (error) {
            errors[field].set(hostname, `Could not save changes. ${error.message}`);
        }
        display_error();
    }

    function save_css(css) {
        return save("css", styles.set_css(host, css));
    }

    const scopes = expanded ? null : available ? [host] : [];
    styles = await load_styles(scopes, () => {
        if (!styles) return;
        if (expanded && saved && host && !styles.has(host)) select("");
        else render();
    });

    if (expanded) refresh_library = bind_library(styles, () => host, select);
    bind_toolbar({
        editor, expanded, tab, available,
        hostname: () => host,
        replace(css) {
            set_text(css);
            return save_css(css);
        },
    });
    bind_editor(save_css);
    enabled.addEventListener("change", () => {
        save("enabled", styles.set_enabled(host, enabled.checked));
    });
    select(host);
    enabled.disabled = !available;
    editor.disabled = !available;
    if (available) editor.focus();

    const selection = tab && await take_selection(tab.id);
    if (source && selection?.hostname === source) open_selector(editor, selection.selector);
}

open_editor().catch(error => show_error(`Could not open the editor. ${error.message}`));
