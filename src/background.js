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

    // Chrome removes by CSS text. Retire reused text before inserting it in its new position.
    // Other sheets can stay visible until their replacements are in place.
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

    // Existing tabs predate the manifest registration. Protected or closed tabs may reject injection.
    const injections = tabs.map(({ id }) => chrome.scripting.executeScript({
        target: { tabId: id, allFrames: script.all_frames },
        files: script.js,
        injectImmediately: true,
    }));
    await Promise.allSettled(injections);
});
