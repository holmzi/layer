<p align="center"><img src="res/icons/512.png" width="256"></p>

**Layer** lets you shape the sites you visit with a few lines of CSS. Give a favorite site a little more room to breathe, or use the same typeface everywhere. Pick an element and see it change as you type. Layer saves each edit and applies it across matching open pages.

Built entirely in vanilla JavaScript, Layer is a lightweight extension for Chromium-based browsers with no dependencies.

## *Preview*

<p align="center"><img src="res/preview.png"></p>

## *Install*

1. Extract the archive to a folder you want to keep.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.

## *Styles*

The popup opens the stylesheet for the current hostname. Each subdomain has its own stylesheet. Use the switch to turn a stylesheet on or off, or open the editor in a tab to manage your styles.

| Control | Effect |
| --- | --- |
| Choose stylesheet | Search saved styles, enter a hostname to create a stylesheet, or select **Global** to edit CSS shared across sites. |
| Open site | Open the selected hostname in a new tab. |
| Delete stylesheet | Remove the selected site's stylesheet after confirmation. |
| Import CSS | Load a `.css` file into the selected stylesheet. Layer asks before replacing existing CSS. |
| Export CSS | Download the stylesheet as a file named after the hostname, such as `github.com.css`, or as `global.css`. |
| Copy CSS | Copy the editor contents to the clipboard. |

Import, export and copy are also available in the popup. Layer applies global CSS first, then the stylesheet for each frame's hostname. It adds `!important` to style declarations when applying them, so you can write and export plain CSS.

## *Editor*

Choose Pick an element in the popup, then click the part of the page you want to change. The popup opens again with your cursor inside the matching CSS rule. If there’s no rule yet, Layer creates one. You can press Esc to cancel.

Whether you’re editing in the popup or in a tab, you get syntax highlighting, matching brackets and quotes, and automatic indentation. When a property or value suggestion appears, use ↑ or ↓ to select it and Tab or Enter to insert it.

A wavy underline marks a syntax error. Click the message below the editor to jump to it. If there’s more than one error, the arrows next to the message let you step through them.

| Shortcut | Action |
| --- | --- |
| `Alt+↑`, `Alt+↓` | Move the current line or selected lines up or down. |
| `Shift+Alt+↑`, `Shift+Alt+↓` | Duplicate lines above or below. |
| `Tab`, `Shift+Tab` | Indent or outdent. |
| `Ctrl+/` | Toggle a CSS comment around the selection or current line. |
| `Ctrl+Enter`, `Ctrl+Shift+Enter` | Insert a line below or above. |
| `Ctrl+Shift+K` | Delete the current line or selected lines. |
