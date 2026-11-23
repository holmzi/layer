import { clear_selection } from "../picker/session.js";
import { accept_pick } from "./picker.js";
import { apply_styles } from "./style.js";

chrome.runtime.onConnect.addListener(accept_pick);
chrome.tabs.onRemoved.addListener(clear_selection);

chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.type !== "apply" || !sender.tab || !sender.documentId) return;

    const target = { tabId: sender.tab.id, documentIds: [sender.documentId] };
    const { applied, desired } = message;
    apply_styles(target, applied, desired).then(
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
