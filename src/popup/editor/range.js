export function create_range_reader(content) {
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let offset = 0;

    function seek(position) {
        if (position < offset) {
            walker.currentNode = content;
            node = walker.nextNode();
            offset = 0;
        }
        while (node && position > offset + node.length) {
            offset += node.length;
            node = walker.nextNode();
        }
        return node;
    }

    return (start, end = start) => {
        if (!seek(start)) return null;
        const range = new Range();
        range.setStart(node, start - offset);
        if (!seek(end)) return null;
        range.setEnd(node, end - offset);
        return range;
    };
}

export function reveal(editor, start, end = start) {
    editor.setSelectionRange(start, end);
    const line = editor.value.slice(0, start).split("\n").length - 1;
    const height = parseFloat(getComputedStyle(editor).lineHeight);
    editor.scrollTop = Math.max(0, line * height - editor.clientHeight / 2);
}
