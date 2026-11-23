(() => {
    "use strict";

    globalThis.stopLayerPicker?.();
    const listeners = new AbortController();
    const { signal } = listeners;
    const previousFocus = document.activeElement;
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        :host {
            all: initial !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
        }
        #surface { position: absolute; inset: 0; pointer-events: auto; cursor: crosshair; outline: 0; }
        #box, #label { position: absolute; pointer-events: none; box-sizing: border-box; }
        #box { border: 2px solid #6897bb; background: rgb(104 151 187 / 15%); }
        #label {
            top: 8px; left: 8px; max-width: calc(100% - 16px); padding: 5px 8px;
            border: 1px solid #444; border-radius: 4px; background: #191919;
            color: #eee; font: 12px/18px monospace; overflow: hidden;
            white-space: nowrap; text-overflow: ellipsis;
        }
    `);
    shadow.adoptedStyleSheets = [sheet];
    const surface = document.createElement("div");
    surface.id = "surface";
    surface.tabIndex = -1;
    const box = document.createElement("div");
    box.id = "box";
    box.hidden = true;
    const label = document.createElement("div");
    label.id = "label";
    label.textContent = "Pick an element · Esc to cancel";
    shadow.append(surface, box, label);
    document.documentElement.append(host);
    surface.focus({ preventScroll: true });

    let target = null;
    let selector = "";
    let pointer;
    let frame = 0;
    let opening = false;

    function stop() {
        if (signal.aborted) return;
        listeners.abort();
        cancelAnimationFrame(frame);
        const restoreFocus = document.activeElement === host;
        host.remove();
        if (restoreFocus && previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
        delete globalThis.stopLayerPicker;
    }

    globalThis.stopLayerPicker = stop;

    function openPopup(selected) {
        if (opening) return;
        opening = true;
        const port = chrome.runtime.connect({ name: "picked-element" });
        function failed(message) {
            opening = false;
            label.textContent = message;
        }
        port.onMessage.addListener((result) => {
            port.disconnect();
            if (result.error) failed(result.error);
            else stop();
        });
        port.onDisconnect.addListener(() => {
            const error = chrome.runtime.lastError;
            if (!signal.aborted) failed(error?.message || "Connection closed. Click to retry.");
        });
        port.postMessage({ selector: selected });
    }

    function selectorFor(element) {
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

    function highlight(force = false) {
        if (!pointer) return;
        surface.style.pointerEvents = "none";
        const element = document.elementFromPoint(pointer.x, pointer.y);
        surface.style.pointerEvents = "";
        if (!element || element === host) {
            target = null;
            selector = "";
            box.hidden = true;
            label.textContent = "Pick an element · Esc to cancel";
            return;
        }
        if (force || element !== target) {
            target = element;
            selector = selectorFor(element);
        }
        const count = selector ? document.querySelectorAll(selector).length : 0;
        label.textContent = selector + " · " + count + (count === 1 ? " match" : " matches");
        const rect = element.getBoundingClientRect();
        box.hidden = false;
        Object.assign(box.style, {
            left: rect.left + "px", top: rect.top + "px",
            width: rect.width + "px", height: rect.height + "px",
        });
        label.style.left = Math.max(0, Math.min(pointer.x + 14, innerWidth - label.offsetWidth - 4)) + "px";
        label.style.top = Math.max(0, Math.min(pointer.y + 16, innerHeight - label.offsetHeight - 4)) + "px";
    }

    function scheduleHighlight() {
        if (!frame) frame = requestAnimationFrame(() => {
            frame = 0;
            highlight();
        });
    }

    function suppress(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    window.addEventListener("pointermove", (event) => {
        pointer = { x: event.clientX, y: event.clientY };
        event.stopImmediatePropagation();
        scheduleHighlight();
    }, { capture: true, signal });
    window.addEventListener("scroll", scheduleHighlight, { capture: true, signal });
    window.addEventListener("resize", scheduleHighlight, { signal });
    for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "auxclick", "contextmenu"]) {
        window.addEventListener(type, suppress, { capture: true, signal });
    }
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            suppress(event);
            stop();
        }
    }, { capture: true, signal });
    window.addEventListener("pagehide", stop, { once: true, signal });
    window.addEventListener("click", (event) => {
        suppress(event);
        if (!event.isTrusted || opening || event.button !== 0) return;
        pointer = { x: event.clientX, y: event.clientY };
        highlight(true);
        if (selector) openPopup(selector);
    }, { capture: true, signal });
})();
