const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut, nativeImage, shell } = require('electron');
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');
const fs = require('fs').promises;
const YTDlpWrap = require('yt-dlp-wrap').default;
const NodeID3 = require('node-id3');

// --- Electron-Config ---
app.commandLine.appendSwitch('--disk-cache-size', '0');
app.commandLine.appendSwitch('--disable-gpu-shader-disk-cache');

const cachePath = path.join(app.getPath('userData'), 'cache');
app.setPath('cache', cachePath);

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
    win.once('ready-to-show', () => { win.show(); });
    return win;
}

async function main() {
    try {
        const { default: StoreModule } = await import('electron-store');
        Store = StoreModule;
        mm = await import('music-metadata');
    } catch (e) {
        console.error('Failed to import ESM modules', e);
        app.quit();
        return;
    }

    const store = new Store({
        defaults: {
            downloadFolder: app.getPath('downloads'),
            audioQuality: 'best',
            animationMode: 'flow',
            theme: 'blue',
            visualizerEnabled: true,
            visualizerStyle: 'bars',
            visSensitivity: 1.5,
            coverEmoji: 'note',
            customCoverEmoji: '🎵',
            autoLoadLastFolder: true,
            enableFocusMode: true,
            enableDragAndDrop: true,
            useCustomColor: false,
            customAccentColor: '#38bdf8',
            language: 'de',
            volume: 0.2,
            sortMode: 'name',
            targetFps: 60,
            performanceMode: false,
            showStatsOverlay: false,
            cinemaMode: false,
            playbackSpeed: 1.0,
            bassBoostEnabled: false,
            bassBoostValue: 6,
            trebleBoostEnabled: false,
            trebleBoostValue: 6,
            reverbEnabled: false,
            reverbValue: 30,
            favorites: [],
            enableFavoritesPlaylist: true,
            miniMode: false
        }
    });

    registerIpcHandlers(store);
    const win = createWindow();

    const prevIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/previous.svg'));
    const nextIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/next.svg'));
    const playIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/play.svg'));
    const pauseIcon = nativeImage.createFromPath(path.join(__dirname, 'assets/pause.svg'));

    const updateThumbar = (isPlaying) => {
        const thumbarButtons = [
            { tooltip: 'Previous', icon: prevIcon, click: () => win.webContents.send('media-control', 'previous') },
            { tooltip: isPlaying ? 'Pause' : 'Play', icon: isPlaying ? pauseIcon : playIcon, click: () => win.webContents.send('media-control', 'play-pause') },
            { tooltip: 'Next', icon: nextIcon, click: () => win.webContents.send('media-control', 'next') }
        ];
        win.setThumbarButtons(thumbarButtons);
    };

    updateThumbar(false);
    ipcMain.on('playback-state', (event, isPlaying) => { updateThumbar(isPlaying); });

    globalShortcut.register('MediaPlayPause', () => { win.webContents.send('media-control', 'play-pause'); });
    globalShortcut.register('MediaNextTrack', () => { win.webContents.send('media-control', 'next'); });
    globalShortcut.register('MediaPreviousTrack', () => { win.webContents.send('media-control', 'previous'); });
}

function registerIpcHandlers(store) {
    ipcMain.handle('get-settings', () => { return store.store; });
    ipcMain.handle('set-setting', async (event, key, value) => { await store.set(key, value); });
    
    ipcMain.handle('show-in-folder', async (event, filePath) => {
        shell.showItemInFolder(filePath);
    });

    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
    });

    ipcMain.handle('select-music-folder', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (result.canceled || result.filePaths.length === 0) return { tracks: null, folderPath: null };
        const folderPath = result.filePaths[0];
        const files = await fs.readdir(folderPath);
        const tracks = await processTracksInBatches(files, folderPath);
        return { tracks, folderPath };
    });

    ipcMain.handle('refresh-music-folder', async (event, folderPath) => {
        try {
            let targetPath = folderPath;
            const stat = await fs.stat(folderPath);
            if (stat.isFile()) {
                targetPath = path.dirname(folderPath);
            }
            const files = await fs.readdir(targetPath);
            const tracks = await processTracksInBatches(files, targetPath);
            return { tracks, folderPath: targetPath };
        } catch (error) {
            return { tracks: null, folderPath: null, error: error.message };
        }
    });

    ipcMain.handle('update-title', async (event, filePath, newTitle) => {
        try {
            const success = NodeID3.update({ title: newTitle }, filePath);
            return { success: !!success };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('delete-track', async (event, filePath) => {
        try { await fs.unlink(filePath); return { success: true }; }
        catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('move-file', async (event, { sourcePath, destFolder }) => {
        try {
            const fileName = path.basename(sourcePath);
            const destPath = path.join(destFolder, fileName);
            if (sourcePath === destPath) return { success: true };
            await fs.rename(sourcePath, destPath);
            return { success: true, newPath: destPath };
        } catch (error) {
            try {
                const fileName = path.basename(sourcePath);
                const destPath = path.join(destFolder, fileName);
                await fs.copyFile(sourcePath, destPath);
                await fs.unlink(sourcePath);
                return { success: true, newPath: destPath };
            } catch (copyError) {
                return { success: false, error: copyError.message };
            }
        }
    });

    ipcMain.on('set-window-size', (event, { width, height }) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.setSize(width, height, true);
    });

    ipcMain.handle('download-from-youtube', async (event, { url, customName, quality }) => {
        try {
            let downloadFolder = store.get('downloadFolder');
            const ytDlpPath = app.isPackaged 
                ? path.join(process.resourcesPath, 'yt-dlp.exe')
                : path.join(__dirname, 'yt-dlp.exe');

            const ytDlpWrap = new YTDlpWrap(ytDlpPath);
            const qualityMap = { best: '0', high: '5', standard: '9' };
            
            const sanitize = (name) => name.replace(/[<>:"/\\|?*]/g, '_').trim();
            const safeName = customName ? sanitize(customName) : null;
            const fileNameTemplate = safeName ? `${safeName}.%(ext)s` : '%(title)s.%(ext)s';

            const ytDlpProcess = ytDlpWrap.exec([
                url, '-x', '--audio-format', 'mp3', '--audio-quality', qualityMap[quality] || '0',
                '--embed-thumbnail', '--add-metadata', '-P', downloadFolder, '-o', fileNameTemplate,
            ]);
            
            ytDlpProcess.on('progress', (progress) => { event.sender.send('download-progress', { percent: progress.percent }); });
            await new Promise((resolve, reject) => {
                ytDlpProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`yt-dlp exited with code ${code}`)));
                ytDlpProcess.on('error', reject);
            });

            if (safeName) {
                try {
                    const filePath = path.join(downloadFolder, `${safeName}.mp3`);
                    NodeID3.update({ title: customName }, filePath);
                } catch (err) {
                    console.error('Failed to update metadata title:', err);
                }
            }

            return { success: true };
        } catch (error) { return { success: false, error: error.message }; }
    });
}

async function processTracksInBatches(files, folderPath) {
    const validFiles = files.filter(file => SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()));
    const tracks = [];
    const batchSize = 20; 
    for (let i = 0; i < validFiles.length; i += batchSize) {
        const batch = validFiles.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
            const filePath = path.join(folderPath, file);
            try {
                const stat = await fs.stat(filePath);
                if (!stat.isFile()) return null;

                const metadata = await mm.parseFile(filePath, { skipCovers: true, duration: true }).catch(() => null);
                
                return {
                    path: filePath,
                    title: (metadata && metadata.common && metadata.common.title) || path.basename(filePath, path.extname(filePath)),
                    artist: (metadata && metadata.common && metadata.common.artist) || null,
                    duration: (metadata && metadata.format && metadata.format.duration) || 0,
                    mtime: stat.mtimeMs || 0,
                };
            } catch (error) { 
                console.error(`Error processing file ${file}:`, error);
                return null; 
            }
        });
        const batchResults = await Promise.all(batchPromises);
        tracks.push(...batchResults.filter(Boolean));
    }
    return tracks;
}

app.whenReady().then(main);
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });