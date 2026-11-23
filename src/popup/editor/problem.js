import { create_range_reader, reveal } from "./range.js";

const previous = document.getElementById("previous-problem");
const next = document.getElementById("next-problem");
const bar = document.getElementById("diagnostics");
const label = document.getElementById("problem");
let issues = [];
let index = 0;

function display() {
    bar.hidden = !issues.length;
    if (bar.hidden) return;
    const problem = issues[index];
    const prefix = issues.length > 1 ? `${index + 1}/${issues.length} · ` : "";
    label.textContent = `${prefix}Line ${problem.line} · ${problem.message}`;
    previous.hidden = next.hidden = issues.length < 2;
}

function jump(step) {
    if (!issues.length) return;
    index = (index + step + issues.length) % issues.length;
    const { at, end } = issues[index];
    const editor = document.getElementById("editor");
    editor.focus();
    reveal(editor, at, end);
    display();
}

previous.onclick = () => jump(-1);
next.onclick = () => jump(1);
label.onclick = () => jump(0);

export function check_css(source, content) {
    issues = find_css_errors(source);
    index = 0;
    const read_range = create_range_reader(content);
    const marks = new Highlight();
    let line = 1;
    let position = 0;
    for (const problem of issues) {
        while (position < problem.at) {
            if (source[position++] === "\n") line++;
        }
        problem.line = line;
        const range = read_range(problem.at, problem.end);
        if (range) marks.add(range);
    }
    CSS.highlights.set("css-error", marks);
    display();
}
