export async function apply_styles(target, applied, desired) {
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
