"use strict";

function style_keys(hostname) {
    const scope = hostname ? `site:${hostname}` : "global";
    return { enabled: scope + ":enabled", saved: scope + ":saved", css: scope + ":css" };
}

async function load_styles(hostnames, notify) {
    const storage = chrome.storage.local;
    const keys = hostnames && new Set(hostnames.flatMap(host => Object.values(style_keys(host))));
    const pending = new Map();
    const values = new Map();
    let loading;

    function update(key, value) {
        if (value === undefined) values.delete(key);
        else values.set(key, value);
    }

    function receive(changes) {
        let changed = false;
        for (const [key, change] of Object.entries(changes)) {
            if (keys && !keys.has(key)) continue;
            const entry = pending.get(key);
            if (entry && entry.value === change.newValue) entry.observed = true;
            update(key, change.newValue);
            loading?.set(key, change.newValue);
            changed = true;
        }
        if (changed && !loading) notify();
    }

    async function reload() {
        const changes = new Map();
        loading = changes;
        try {
            const snapshot = await storage.get(keys ? Array.from(keys) : null);
            if (loading !== changes) return;
            values.clear();
            for (const [key, value] of Object.entries(snapshot)) values.set(key, value);
            for (const [key, value] of changes) update(key, value);
        } finally {
            if (loading === changes) loading = null;
        }
    }

    function read(key) {
        return pending.get(key)?.value ?? values.get(key);
    }

    async function write(key, value) {
        const promise = storage.set({ [key]: value });
        const entry = { promise, value, observed: false };
        pending.set(key, entry);
        try {
            await promise;
            if (pending.get(key) !== entry) return false;
            if (!entry.observed) update(key, value);
            return true;
        } catch (error) {
            if (pending.get(key) !== entry) return false;
            update(key, value);
            throw error;
        } finally {
            if (pending.get(key) === entry) {
                pending.delete(key);
                notify();
            }
        }
    }

    storage.onChanged.addListener(receive);
    try {
        await reload();
    } catch (error) {
        storage.onChanged.removeListener(receive);
        throw error;
    }

    return {
        reload,
        get_css: host => read(style_keys(host).css) ?? "",
        set_css: (host, value) => write(style_keys(host).css, value),
        is_enabled: host => read(style_keys(host).enabled) ?? true,
        set_enabled: (host, value) => write(style_keys(host).enabled, value),

        has(host) {
            return Object.values(style_keys(host)).some(key => values.has(key));
        },

        hosts() {
            const sites = new Set();
            for (const key of values.keys()) {
                const match = /^site:(.+):(css|enabled|saved)$/.exec(key);
                if (match) sites.add(match[1]);
            }
            return Array.from(sites).sort();
        },

        create(host) {
            return write(style_keys(host).saved, true);
        },

        async remove(host) {
            const keys = Object.values(style_keys(host));
            await Promise.allSettled(keys.map(key => pending.get(key)?.promise));
            await storage.remove(keys);
        },
    };
}
