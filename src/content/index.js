(() => {
    "use strict";

    if (globalThis.layer_attached) return;
    globalThis.layer_attached = true;

    const hostname = location.hostname;
    const scopes = hostname ? ["", hostname] : [""];
    let queue = Promise.resolve();
    let applied = [];
    let styles;

    async function apply() {
        if (!styles) return;
        const desired = [];
        for (const host of scopes) {
            if (!styles.is_enabled(host)) continue;
            const css = styles.get_css(host);
            if (css) desired.push(apply_priority(css));
        }
        if (desired.length === applied.length && desired.every((css, i) => css === applied[i])) return;

        const result = await chrome.runtime.sendMessage({ type: "apply", applied, desired });
        applied = result.applied;
        if (result.error) throw new Error(result.error);
    }

    function report(error) {
        console.warn("Layer could not update this document.", error);
    }

    function schedule() {
        queue = queue.then(apply).catch(report);
    }

    async function load() {
        if (styles) await styles.reload();
        else styles = await load_styles(scopes, schedule);
        schedule();
    }

    chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message.type === "hostname") reply(hostname);
    });
    window.addEventListener("pageshow", event => {
        if (event.persisted) load().catch(report);
    });
    load().catch(report);
})();
