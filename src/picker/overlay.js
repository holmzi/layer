function create_picker_overlay() {
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
            border: 1px solid #444; background: #191919;
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
    const label = document.createElement("div");
    label.id = "label";
    shadow.append(surface, box, label);
    document.documentElement.append(host);
    surface.focus({ preventScroll: true });

    function clear() {
        box.hidden = true;
        label.textContent = "Pick an element · Esc to cancel";
    }

    function show(rect, pointer, selector, count) {
        label.textContent = selector + " · " + count + (count === 1 ? " match" : " matches");
        box.hidden = false;
        Object.assign(box.style, {
            left: rect.left + "px",
            top: rect.top + "px",
            width: rect.width + "px",
            height: rect.height + "px",
        });
        label.style.left = Math.max(0, Math.min(pointer.x + 14, innerWidth - label.offsetWidth - 4)) + "px";
        label.style.top = Math.max(0, Math.min(pointer.y + 16, innerHeight - label.offsetHeight - 4)) + "px";
    }

    clear();
    return { host, surface, label, clear, show };
}
