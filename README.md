# *Layer*

Layer is a CSS editor for Chrome. Open its toolbar popup and write CSS for the current hostname or select Global to edit the stylesheet shared by all sites. Each edit is saved in the current browser profile and applied to matching open pages.

## *Install*

1. Extract the archive to a folder you want to keep.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.

## *Styles*

- Switch controls the selected stylesheet. Turning it off keeps its text.
- Site rules follow global rules. Each hostname has its own stylesheet, including subdomains. An embedded web page uses its own hostname.
- Layer adds user-origin CSS. Use `!important` to override a declaration supplied by the website.
