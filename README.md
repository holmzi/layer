<p align="center"><img src="res/icons/512.png" width="128"></p>

**Layer** lets you style websites with your own CSS in Chromium-based browsers. Open the editor from the toolbar to adjust the site you're on, or write a global rule that follows you across sites. Changes are saved as you type and appear on matching open pages without a reload.

## *Preview*

<p align="center"><img src="res/preview.png"></p>

## *Install*

1. Extract the archive to a folder you want to keep.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.

## *Styles*

| Control | Effect |
| --- | --- |
| Global | Edit the stylesheet shared across sites. |
| Hostname | Edit the stylesheet for the current hostname. Each subdomain has its own stylesheet. |
| Switch | Turn the selected stylesheet on or off. Your CSS stays in the editor. |

Layer applies global CSS first, then the stylesheet for each frame's hostname. To override a site's own declaration, add `!important` to yours.
