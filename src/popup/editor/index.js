import { bind_completion } from "./completion.js";
import { highlight } from "./highlight.js";
import { bind_keys } from "./keyboard.js";
import { check_css } from "./problem.js";

export const editor = document.querySelector("#editor");
const editor_content = document.querySelector(".editor-content");
const syntax_content = document.querySelector("#syntax-content");
const line_number_content = document.querySelector("#line-number-content");
let displayed_line_count = 0;
let close_completion;

function sync_editor_scroll() {
    const offset = -editor.scrollTop;
    line_number_content.style.transform = `translateY(${offset}px)`;
    syntax_content.style.transform = `translate(${-editor.scrollLeft}px, ${offset}px)`;
}

function update_line_numbers() {
    const line_count = editor.value.split("\n").length;
    if (line_count !== displayed_line_count) {
        line_number_content.textContent = Array.from(
            { length: line_count },
            (_, index) => index + 1,
        ).join("\n");
        displayed_line_count = line_count;
    }
}

function update_editor() {
    update_line_numbers();
    syntax_content.replaceChildren(highlight(editor.value));
    check_css(editor.value, syntax_content);
    editor_content.classList.add("highlight-ready");
    sync_editor_scroll();
}

export function set_text(css) {
    if (editor.value === css) return;
    close_completion?.();
    editor.value = css;
    update_editor();
}

export function bind_editor(on_change) {
    const replace = bind_keys(editor);
    editor.addEventListener("scroll", sync_editor_scroll);
    editor.addEventListener("input", () => {
        update_editor();
        on_change(editor.value);
    });
    close_completion = bind_completion(editor, replace);
    update_editor();
}
