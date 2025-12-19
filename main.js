const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');
const fs = require('fs').promises;
const YTDlpWrap = require('yt-dlp-wrap').default;
const NodeID3 = require('node-id3');

// --- Electron-Konfiguration vor App-Start ---
app.commandLine.appendSwitch('--disk-cache-size', '0');
app.commandLine.appendSwitch('--disable-gpu-shader-disk-cache');
// app.disableHardwareAcceleration(); // Disabled to improve performance

// --- Cache-Verzeichnis vor der App-Initialisierung setzen ---
const cachePath = path.join(app.getPath('userData'), 'cache');
app.setPath('cache', cachePath);

// --- Globale Variablen für dynamisch importierte Module ---
let Store;
let mm;

const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg'];

function createWindow() {
    const win = new BrowserWindow({
        width: 1300,
        height: 900,
        minWidth: 320,
        minHeight: 450,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
            sandbox: true,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets/icon.png'),
        backgroundColor: '#0a0e1b',
        show: false,
    });

    win.webContents.session.setProxy({ proxyRules: 'direct://' });
    win.loadFile('index.html');
    win.once('ready-to-show', () => {
        win.show();
    });
    return win;
}

// Die Hauptlogik wird in einer async Funktion ausgeführt, nachdem die App bereit ist.
async function main() {
    // Dynamischer Import der ESM-Module
    try {
        const { default: StoreModule } = await import('electron-store');
        Store = StoreModule;
        mm = await import('music-metadata');
    } catch (e) {
        console.error('Failed to import ESM modules', e);
        app.quit();
        return;
    }

    // Initialisiere electron-store
    const store = new Store({
        defaults: {
            downloadFolder: app.getPath('downloads'),
            audioQuality: 'best',
            animationsEnabled: true,
            theme: 'blue',
            visualizerEnabled: true,
            coverEmoji: 'note', // Default cover emoji type
            customCoverEmoji: '🎵', // Default custom cover emoji
            autoLoadLastFolder: true, // Default to true
        }
    });

    // Registriere alle IPC-Handler, nachdem die Module geladen sind
    registerIpcHandlers(store);
    
    const win = createWindow();

    const prevIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/previous.svg'));
    const nextIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/next.svg'));
    const playIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/play.svg'));
    const pauseIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/pause.svg'));

    const updateThumbar = (isPlaying) => {
        const playPauseButton = {
            tooltip: isPlaying ? 'Pause' : 'Play',
            icon: isPlaying ? pauseIcon : playIcon,
            click: () => win.webContents.send('media-control', 'play-pause'),
        };

        const thumbarButtons = [
            {
                tooltip: 'Previous',
                icon: prevIcon,
                click: () => win.webContents.send('media-control', 'previous'),
            },
            playPauseButton,
            {
                tooltip: 'Next',
                icon: nextIcon,
                click: () => win.webContents.send('media-control', 'next'),
            },
        ];
        win.setThumbarButtons(thumbarButtons);
    };

    updateThumbar(false);

    ipcMain.on('playback-state', (event, isPlaying) => {
        updateThumbar(isPlaying);
    });

    globalShortcut.register('MediaPlayPause', () => {
        win.webContents.send('media-control', 'play-pause');
    });
    globalShortcut.register('MediaNextTrack', () => {
        win.webContents.send('media-control', 'next');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
        win.webContents.send('media-control', 'previous');
    });
}

function registerIpcHandlers(store) {
    // --- IPC-Handler für EINSTELLUNGEN ---
    ipcMain.handle('get-settings', () => {
        return store.store;
    });

    ipcMain.handle('set-setting', async (event, key, value) => {
        await store.set(key, value);
    });

    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    // --- IPC-Handler für MUSIK & DOWNLOADS ---
    ipcMain.handle('select-music-folder', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (result.canceled || result.filePaths.length === 0) {
            return { tracks: null, folderPath: null };
        }
        const folderPath = result.filePaths[0];
        const files = await fs.readdir(folderPath);
        const tracks = await processTracksInBatches(files, folderPath);
        return { tracks, folderPath };
    });

    ipcMain.handle('refresh-music-folder', async (event, folderPath) => {
        try {
            const files = await fs.readdir(folderPath);
            const tracks = await processTracksInBatches(files, folderPath);
            return { tracks, folderPath };
        } catch (error) {
            console.error('Error refreshing music folder:', error);
            return { tracks: null, folderPath: null, error: error.message };
        }
    });

    ipcMain.handle('get-cover', async (event, filePath) => {
        try {
            const metadata = await mm.parseFile(filePath);
            const cover = mm.selectCover(metadata.common.picture);
            return cover ? `data:${cover.format};base64,${cover.data.toString('base64')}` : null;
        } catch (error) {
            return null;
        }
    });

    ipcMain.handle('update-title', async (event, filePath, newTitle) => {
        try {
            const success = NodeID3.update({ title: newTitle }, filePath);
            if (success) {
                return { success: true };
            } else {
                return { success: false, error: 'Failed to update title using NodeID3.' };
            }
        } catch (error) {
            console.error('Error updating title:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('delete-track', async (event, filePath) => {
        try {
            await fs.unlink(filePath);
            return { success: true };
        } catch (error) {
            console.error('Error deleting track:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('set-window-size', (event, { width, height }) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setSize(width, height, true);
        }
    });

    ipcMain.handle('download-from-youtube', async (event, { url, customName, quality }) => {
        try {
            let downloadFolder = store.get('downloadFolder');
            if (!downloadFolder) {
                const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
                if (result.canceled || result.filePaths.length === 0) {
                    return { success: false, error: 'Download folder selection was canceled.' };
                }
                downloadFolder = result.filePaths[0];
                store.set('downloadFolder', downloadFolder);
            }

            const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
            const ytDlpWrap = new YTDlpWrap(ytDlpPath);
            
            const qualityMap = { best: '0', high: '5', standard: '9' };
            const fileNameTemplate = customName ? `${customName}.%(ext)s` : '%(title)s.%(ext)s';

            const process = ytDlpWrap.exec([
                url, '-x',
                '--audio-format', 'mp3',
                '--audio-quality', qualityMap[quality] || '0',
                '--embed-thumbnail', '--add-metadata',
                '-P', downloadFolder,
                '-o', fileNameTemplate,
            ]);
            
            process.on('progress', (progress) => {
                event.sender.send('download-progress', { percent: progress.percent });
            });

            await new Promise((resolve, reject) => {
                process.on('close', (code) => code === 0 ? resolve() : reject(new Error(`yt-dlp exited with code ${code}`)));
                process.on('error', reject);
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

// --- App-Lebenszyklus ---
app.whenReady().then(main);

app.on('will-quit', () => {
    // Unregister all shortcuts.
    globalShortcut.unregisterAll();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

async function processTracksInBatches(files, folderPath) {
    const validFiles = files.filter(file => SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()));
    const tracks = [];
    const batchSize = 10; 

    for (let i = 0; i < validFiles.length; i += batchSize) {
        const batch = validFiles.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
            const filePath = path.join(folderPath, file);
            try {
                // mm is available in outer scope because it is defined at top level
                const metadata = await mm.parseFile(filePath, { skipCovers: true, duration: true });
                const stat = await fs.stat(filePath);
                return {
                    path: filePath,
                    title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
                    artist: metadata.common.artist || 'Unbekannt',
                    duration: metadata.format.duration || 0,
                    mtime: stat.mtimeMs || 0,
                };
            } catch (error) {
                return null;
            }
        });
        const batchResults = await Promise.all(batchPromises);
        tracks.push(...batchResults.filter(Boolean));
    }
    return tracks;
}