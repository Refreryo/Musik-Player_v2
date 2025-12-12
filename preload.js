const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- Musik & Player ---
    selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
    getCover: (filePath) => ipcRenderer.invoke('get-cover', filePath),

    // --- Downloader ---
    downloadFromYouTube: (options) => ipcRenderer.invoke('download-from-youtube', options),
    onDownloadProgress: (callback) => {
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.on('download-progress', (event, data) => callback(data));
    },

    // --- Einstellungen ---
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
});
