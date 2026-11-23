function selection_key(tab_id) {
    return `picker:${tab_id}`;
}

export async function open_popup(tab, hostname, selector) {
    const key = selection_key(tab.id);
    await chrome.storage.session.set({ [key]: { hostname, selector } });
    const current = await chrome.tabs.get(tab.id);
    if (current.active) await chrome.action.openPopup({ windowId: current.windowId });
}

export async function take_selection(tab_id) {
    const key = selection_key(tab_id);
    const selection = (await chrome.storage.session.get(key))[key];
    if (selection) await chrome.storage.session.remove(key);
    return selection;
}

export function clear_selection(tab_id) {
    return chrome.storage.session.remove(selection_key(tab_id));
}
