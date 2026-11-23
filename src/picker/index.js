(() => {
    "use strict";

    globalThis.stop_layer_picker?.();
    const listeners = new AbortController();
    const { signal } = listeners;
    const capture = { capture: true, signal };
    const previous_focus = document.activeElement;
    const overlay = create_picker_overlay();
    const { host, surface, label } = overlay;

    let target = null;
    let selector = "";
    let pointer;
    let frame = 0;
    let opening = false;

    function stop() {
        if (signal.aborted) return;
        listeners.abort();
        cancelAnimationFrame(frame);
        const restore_focus = document.activeElement === host;
        host.remove();
        if (restore_focus && previous_focus?.isConnected) previous_focus.focus?.({ preventScroll: true });
        delete globalThis.stop_layer_picker;
    }

    globalThis.stop_layer_picker = stop;

    function open_popup(selected) {
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

    function highlight(force = false) {
        if (!pointer) return;
        surface.style.pointerEvents = "none";
        const element = document.elementFromPoint(pointer.x, pointer.y);
        surface.style.pointerEvents = "";
        if (!element || element === host) {
            target = null;
            selector = "";
            overlay.clear();
            return;
        }
        if (force || element !== target) {
            target = element;
            selector = selector_for(element);
        }
        const count = selector ? document.querySelectorAll(selector).length : 0;
        overlay.show(element.getBoundingClientRect(), pointer, selector, count);
    }

    function schedule_highlight() {
        if (frame) return;
        frame = requestAnimationFrame(() => {
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
        schedule_highlight();
    }, capture);
    window.addEventListener("scroll", schedule_highlight, capture);
    window.addEventListener("resize", schedule_highlight, { signal });
    for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "auxclick", "contextmenu"]) {
        window.addEventListener(type, suppress, capture);
    }
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            suppress(event);
            stop();
        }
    }, capture);
    window.addEventListener("pagehide", stop, { once: true, signal });
    window.addEventListener("click", (event) => {
        suppress(event);
        if (!event.isTrusted || opening || event.button !== 0) return;
        pointer = { x: event.clientX, y: event.clientY };
        highlight(true);
        if (selector) open_popup(selector);
    }, capture);
})();
