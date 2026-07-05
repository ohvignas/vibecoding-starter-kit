# Exemple de référence — feature « Notes » (Electron)

> Patron à imiter : IPC sûr entre l'interface et le disque.

## IPC sûr — `preload.js`
```js
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("notes", {
  save: (text) => ipcRenderer.invoke("notes:save", text),
  load: () => ipcRenderer.invoke("notes:load"),
});
```

## Main — `main.js`
```js
const fs = require("node:fs"); const path = require("node:path");
const file = path.join(app.getPath("userData"), "notes.txt");
ipcMain.handle("notes:save", (_e, text) => fs.writeFileSync(file, String(text)));
ipcMain.handle("notes:load", () => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } });
```
Points clés : `contextIsolation: true`, jamais `nodeIntegration`, l'accès disque reste dans le main.
