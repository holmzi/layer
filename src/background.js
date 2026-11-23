"use strict";

async function applyStyles(target, applied, desired) {
    let keep = 0;
    while (keep < applied.length && applied[keep] === desired[keep]) {
        keep++;
    }

    const obsolete = applied.slice(keep).reverse();
    const additions = desired.slice(keep);
    const injection = { target, origin: "USER" };

    async function remove(css) {
        await chrome.scripting.removeCSS({ ...injection, css });
        applied.splice(applied.lastIndexOf(css), 1);
    }

    for (const css of obsolete) {
        if (additions.includes(css)) await remove(css);
    }
    for (const css of additions) {
        await chrome.scripting.insertCSS({ ...injection, css });
        applied.push(css);
    }
    for (const css of obsolete) {
        if (!additions.includes(css)) await remove(css);
    }
}

async function openPickerPopup(tab, hostname, selector) {
    const key = `picker:${tab.id}`;
    await chrome.storage.session.set({ [key]: { hostname, selector } });
    const active = await chrome.tabs.get(tab.id);
    if (!active.active) return;
    await chrome.action.openPopup({ windowId: active.windowId });
}

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "picked-element") return;
    const sender = port.sender;
    if (sender?.tab?.id == null || sender.frameId !== 0 || !sender.url) {
        port.disconnect();
        return;
    }

    const hostname = new URL(sender.url).hostname;
    port.onMessage.addListener(async ({ selector }) => {
        if (!hostname || typeof selector !== "string" || !selector) {
            port.disconnect();
            return;
        }
        let error = "";
        try {
            await openPickerPopup(sender.tab, hostname, selector);
        } catch (cause) {
            error = cause.message;
        }
        try {
            port.postMessage({ error });
        } catch {
            // The source document can close while the popup opens.
        }
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(`picker:${tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.type !== "apply" || !sender.tab || !sender.documentId) return;

    const target = { tabId: sender.tab.id, documentIds: [sender.documentId] };
    const { applied, desired } = message;
    applyStyles(target, applied, desired).then(
        () => reply({ applied }),
        (error) => reply({ applied, error: error.message }),
    );
    return true;
});

chrome.runtime.onInstalled.addListener(async () => {
    const [script] = chrome.runtime.getManifest().content_scripts;
    const tabs = await chrome.tabs.query({ url: script.matches, discarded: false });

    const injections = tabs.map(({ id }) => chrome.scripting.executeScript({
        target: { tabId: id, allFrames: script.all_frames },
        files: script.js,
        injectImmediately: true,
    }));
    await Promise.allSettled(injections);
});
