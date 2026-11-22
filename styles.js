"use strict";

function styleKeys(hostname = "") {
    const scope = hostname ? `site:${hostname}` : "global";
    return { css: `${scope}:css`, enabled: `${scope}:enabled` };
}

function styleDefaults(scopes) {
    const defaults = {};
    for (const { css, enabled } of scopes) {
        defaults[css] = "";
        defaults[enabled] = true;
    }
    return defaults;
}
