const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- Musik & Player ---
    selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
    refreshMusicFolder: (folderPath) => ipcRenderer.invoke('refresh-music-folder', folderPath),
    getCover: (filePath) => ipcRenderer.invoke('get-cover', filePath),
    updateTitle: (filePath, newTitle) => ipcRenderer.invoke('update-title', filePath, newTitle),
    deleteTrack: (filePath) => ipcRenderer.invoke('delete-track', filePath),

    // --- Downloader ---
    downloadFromYouTube: (options) => ipcRenderer.invoke('download-from-youtube', options),
    onDownloadProgress: (callback) => {
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.on('download-progress', (event, data) => callback(data));
    },
    onMediaControl: (callback) => {
        ipcRenderer.removeAllListeners('media-control');
        ipcRenderer.on('media-control', (event, action) => callback(action));
    },
    sendPlaybackState: (isPlaying) => {
        ipcRenderer.send('playback-state', isPlaying);
    },

    // --- Einstellungen ---
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    setWindowSize: (width, height) => ipcRenderer.send('set-window-size', { width, height }),
});
