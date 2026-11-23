import { control, bind } from "./dom.js";

export function bind_toolbar({ editor, hostname, expanded, tab, available, replace }) {
    const input = control("css-file");
    const pick = control("pick");
    let import_host;

    for (const id of ["export-css", "import-css", "copy-css"]) control(id).disabled = !available;
    pick.hidden = expanded;
    pick.disabled = !available;
    control("expand").hidden = expanded;
    control("expand").disabled = false;

    bind(control("expand"), "click", () => {
        const url = new URL(location.href);
        url.searchParams.set("hostname", hostname());
        return chrome.tabs.create({ url: url.href });
    });
    bind(pick, "click", async () => {
        pick.disabled = true;
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id, frameIds: [0] },
                files: ["src/picker/selector.js", "src/picker/overlay.js", "src/picker/index.js"],
            });
            window.close();
        } finally {
            pick.disabled = false;
        }
    });
    bind(control("open-site"), "click", () => chrome.tabs.create({ url: "https://" + hostname() + "/" }));
    bind(control("export-css"), "click", () => {
        const blob = new Blob([editor.value], { type: "text/css;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = (hostname() || "global").replace(/:/g, "_") + ".css";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 30000);
    });
    bind(control("copy-css"), "click", () => navigator.clipboard.writeText(editor.value));
    bind(control("import-css"), "click", () => {
        import_host = hostname();
        input.value = "";
        input.click();
    });
    bind(input, "change", async () => {
        const file = input.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".css")) throw new Error("Choose a .css file.");
        const host = import_host;
        const css = await file.text();
        if (host !== hostname() || css === editor.value) return;
        if (editor.value && !window.confirm(`Replace the CSS for ${host || "Global"} with ${file.name}?`)) return;
        await replace(css);
        editor.focus();
    });
}
