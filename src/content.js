(() => {
    "use strict";

    // Installation can reach a document that already ran the manifest script.
    if (globalThis.layerAttached) return;
    globalThis.layerAttached = true;

    const hostname = location.hostname;
    const scopes = [styleKeys()];
    if (hostname) scopes.push(styleKeys(hostname));
    const defaults = styleDefaults(scopes);

    let settingsReady;
    let applied = [];
    let updates = Promise.resolve();

    async function applyCurrentStyles() {
        const values = await settingsReady;
        const desired = scopes
            .filter(({ css, enabled }) => values[enabled] && values[css])
            .map(({ css }) => values[css]);

        if (desired.length === applied.length && desired.every((css, i) => css === applied[i])) {
            return;
        }

        const result = await chrome.runtime.sendMessage({ type: "apply", applied, desired });
        applied = result.applied;
        if (result.error) throw new Error(result.error);
    }

    function scheduleUpdate() {
        updates = updates.then(applyCurrentStyles).catch((error) => {
            console.warn("Layer could not update this document.", error);
        });
    }

    function loadSettings() {
        settingsReady = chrome.storage.local.get(defaults);
        scheduleUpdate();
    }

    chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message.type === "hostname") reply(hostname);
    });

    chrome.storage.local.onChanged.addListener((changes) => {
        const keys = Object.keys(changes).filter((key) => Object.hasOwn(defaults, key));
        if (!keys.length) return;

        settingsReady.then((values) => {
            for (const key of keys) values[key] = changes[key].newValue ?? defaults[key];
            scheduleUpdate();
        }, loadSettings);
    });

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) loadSettings();
    });

    loadSettings();
})();
