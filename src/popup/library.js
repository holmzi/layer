import { parse_hostname } from "./hostname.js";
import { control, bind } from "./dom.js";

export function bind_library(styles, current, select) {
    const dialog = control("confirm-delete");
    const create = control("create");
    const search = control("search");
    const menu = control("styles");
    const list = control("style-list");
    let deleting = "";

    function choose(host) {
        menu.hidePopover();
        select(host);
        control("editor").focus();
    }

    function refresh() {
        if (!menu.matches(":popover-open")) return;
        const query = search.value.trim().toLowerCase();
        list.replaceChildren();
        for (const host of ["", ...styles.hosts()]) {
            const name = host || "Global";
            if (!name.toLowerCase().includes(query)) continue;
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.host = host;
            button.textContent = name;
            button.setAttribute("aria-current", String(host === current()));
            list.append(button);
        }
        const host = parse_hostname(query);
        create.hidden = !host || styles.has(host);
        create.textContent = host ? `Create “${host}”` : "";
        control("empty").hidden = list.childElementCount > 0 || !create.hidden;
    }

    async function create_style() {
        const host = parse_hostname(search.value);
        if (!host) return;
        menu.hidePopover();
        await styles.create(host);
        choose(host);
    }

    menu.addEventListener("toggle", () => {
        if (!menu.matches(":popover-open")) return;
        search.value = "";
        refresh();
        search.focus();
    });
    search.addEventListener("input", refresh);
    list.addEventListener("click", event => {
        if (event.target instanceof HTMLButtonElement) choose(event.target.dataset.host);
    });
    bind(create, "click", create_style);
    bind(control("find-style"), "submit", async event => {
        event.preventDefault();
        const query = search.value.trim().toLowerCase();
        const exact = Array.from(list.children).find(button => button.textContent.toLowerCase() === query);
        const match = exact ?? list.firstElementChild;
        if (match) choose(match.dataset.host);
        else if (!create.hidden) await create_style();
    });
    control("remove").addEventListener("click", () => {
        deleting = current();
        control("delete-name").textContent = deleting;
        dialog.returnValue = "cancel";
        dialog.showModal();
    });
    bind(dialog, "close", async () => {
        if (dialog.returnValue !== "delete" || !deleting) return;
        const host = deleting;
        await styles.remove(host);
        if (current() === host) select("");
        control("editor").focus();
    });
    return refresh;
}
