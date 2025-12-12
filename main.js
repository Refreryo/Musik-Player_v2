const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const mm = require('music-metadata');
const YTDlpWrap = require('yt-dlp-wrap').default;
const Store = require('electron-store');

// Initialisiere electron-store
const store = new Store({
    defaults: {
        downloadFolder: app.getPath('downloads'),
        audioQuality: 'best',
        animationsEnabled: true,
    }
});

const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg'];

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 940,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets/icon.png'),
        backgroundColor: '#0a0e1b',
        show: false,
    });

    win.loadFile('index.html');
    win.once('ready-to-show', () => {
        win.show();
    });
}

// --- IPC-Handler für EINSTELLUNGEN ---
ipcMain.handle('get-settings', () => {
    return store.store;
});

ipcMain.handle('set-setting', (event, key, value) => {
    store.set(key, value);
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
        return { tracks: null };
    }
    const folderPath = result.filePaths[0];
    const files = await fs.readdir(folderPath);
    const trackPromises = files
        .filter(file => SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()))
        .map(async (file) => {
            const filePath = path.join(folderPath, file);
            try {
                const metadata = await mm.parseFile(filePath);
                return {
                    path: filePath,
                    title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
                    artist: metadata.common.artist || 'Unbekannt',
                    duration: metadata.format.duration || 0,
                };
            } catch (error) {
                console.warn(`Metadaten konnten nicht gelesen werden für: ${file}`, error);
                return null;
            }
        });
    const tracks = (await Promise.all(trackPromises)).filter(Boolean);
    return { tracks };
});

ipcMain.handle('get-cover', async (event, filePath) => {
    try {
        const metadata = await mm.parseFile(filePath);
        const cover = mm.selectCover(metadata.common.picture);
        return cover ? `data:${cover.format};base64,${cover.data.toString('base64')}` : null;
    } catch (error) {
        console.error('Fehler beim Extrahieren des Covers:', error);
        return null;
    }
});

ipcMain.handle('download-from-youtube', async (event, { url, customName, quality }) => {
    console.log(`Starting download for URL: ${url} with quality: ${quality}`);
    try {
        let downloadFolder = store.get('downloadFolder');
        if (!downloadFolder) {
            console.log('No download folder set, asking user.');
            const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
            if (result.canceled || result.filePaths.length === 0) {
                console.log('User canceled folder selection.');
                return { success: false, error: 'Download folder selection was canceled.' };
            }
            downloadFolder = result.filePaths[0];
            store.set('downloadFolder', downloadFolder);
            console.log(`Download folder set to: ${downloadFolder}`);
        }

        const ytDlpPath = await YTDlpWrap.downloadFromGithub();
        const ytDlpWrap = new YTDlpWrap(ytDlpPath);
        
        const qualityMap = {
            best: '0',
            high: '5', // Corresponds to VBR quality in mp3
            standard: '9', // Lower VBR quality
        };

        const fileNameTemplate = customName ? `${customName}.%(ext)s` : '%(title)s.%(ext)s';
        const outputPath = path.join(downloadFolder, fileNameTemplate);

        const process = ytDlpWrap.exec([
            url, '-x',
            '--audio-format', 'mp3',
            '--audio-quality', qualityMap[quality] || '0',
            '--embed-thumbnail', '--add-metadata',
            '-o', outputPath,
        ]);
        
        // --- Enhanced Logging ---
        let stdErrOutput = [];
        process.on('progress', (progress) => {
            event.sender.send('download-progress', { percent: progress.percent });
        });
        
        process.on('ytDlpEvent', (type, data) => {
            // This captures both stdout and stderr
            console.log(`[yt-dlp] ${type}: ${data}`);
            if(type === 'stderr') {
                stdErrOutput.push(data);
            }
        });

        await new Promise((resolve, reject) => {
            process.on('close', (code) => {
                if (code === 0) {
                    console.log('Download finished successfully.');
                    resolve();
                } else {
                    console.error(`yt-dlp process exited with code ${code}.`);
                    // Join stderr output to create a more informative error message
                    reject(new Error(`yt-dlp exited with code ${code}: ${stdErrOutput.join('\n')}`));
                }
            });
            process.on('error', (err) => {
                console.error('Failed to start yt-dlp process:', err);
                reject(err);
            });
        });

        return { success: true, path: outputPath };

    } catch (error) {
        console.error('--- YouTube Download Error ---');
        console.error(error);
        return { success: false, error: error.message };
    }
});

// --- App-Lebenszyklus ---
app.whenReady().then(createWindow);

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
