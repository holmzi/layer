import { open_popup } from "../picker/session.js";

export function accept_pick(port) {
    if (port.name !== "picked-element") return;
    const sender = port.sender;
    if (sender?.tab?.id == null || sender.frameId !== 0 || !sender.url) {
        port.disconnect();
        return;
    }

    const hostname = new URL(sender.url).hostname;
    let connected = true;
    port.onDisconnect.addListener(() => { connected = false; });
    port.onMessage.addListener(async ({ selector }) => {
        if (!hostname || typeof selector !== "string" || !selector) {
            port.disconnect();
            return;
        }
        let error = "";
        try {
            await open_popup(sender.tab, hostname, selector);
        } catch (cause) {
            error = cause.message;
        }
        if (connected) port.postMessage({ error });
    });
}
