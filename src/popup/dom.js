export function control(id) {
    return document.getElementById(id);
}

export function show_error(message) {
    const output = control("error");
    output.textContent = message;
    output.hidden = !message;
}

export function bind(element, event, action) {
    element.addEventListener(event, async (input) => {
        try {
            await action(input);
        } catch (error) {
            show_error(error.message);
        }
    });
}
