export async function active_hostname(tab) {
    if (tab?.id == null) return "";
    try {
        return await chrome.tabs.sendMessage(tab.id, { type: "hostname" }, { frameId: 0 }) || "";
    } catch {
        return "";
    }
}

export function parse_hostname(input) {
    const text = input.trim();
    if (!text || /[\s/@?#\\%]/.test(text)) return "";
    try {
        const host = new URL("https://" + text).hostname;
        if (host.startsWith("[")) return text.endsWith("]") ? host : "";
        if (text.includes(":") || host.length > 253) return "";
        return host.replace(/\.$/, "").split(".").every((label) =>
            /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ? host : "";
    } catch {
        return "";
    }
}
