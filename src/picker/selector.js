function selector_for(element) {
    let path = "";
    for (let node = element; node; node = node.parentElement) {
        const tag = CSS.escape(node.localName);
        const candidates = [];
        if (node.id) candidates.push("#" + CSS.escape(node.id));
        const classes = Array.from(node.classList, (name) => "." + CSS.escape(name));
        candidates.push(...classes);
        if (classes.length > 1) candidates.push(classes.join(""));
        candidates.push(tag);

        for (const part of candidates) {
            const selector = part + path;
            const matches = document.querySelectorAll(selector);
            if (matches.length === 1 && matches[0] === element) return selector;
        }

        let index = 1;
        for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            index++;
        }
        path = tag + ":nth-child(" + index + ")" + path;
        if (document.querySelectorAll(path).length === 1) return path;
        path = " > " + path;
    }
    return "";
}
