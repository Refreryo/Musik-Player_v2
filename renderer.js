// renderer.js - v2.3
// =================================================================================
// STATE & GLOBALS
// =================================================================================

let playlist = [];
let basePlaylist = [];
let currentIndex = -1;
let isPlaying = false;
let audio = new Audio();
let currentVolume = 0.2;
let shuffleOn = false;
let loopMode = 'off'; // 'off', 'all', 'one'
let currentLanguage = 'de';
let settings = {};
let sortMode = 'name'; // 'name', 'newest', 'nameDesc'
let visualizerEnabled = true;
let deleteSongsEnabled = false;
let currentFolderPath = null;
let contextTrackIndex = null;

// Visualizer State
let audioContext, analyser, sourceNode;
let visualizerDataArray;
let visualizerRunning = false;

// DOM Elements
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, openLibraryBtn, libraryOverlay, libraryCloseBtn, refreshFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloaderOverlay, downloaderCloseBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDeleteSongs, toggleDownloaderBtn, contextMenu, contextMenuEditTitle, editTitleOverlay, editTitleInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, autoLoadLastFolderToggle, toggleMiniMode;

let trackToDeletePath = null;
let renderPlaylistRequestId = null;

// =================================================================================
// TRANSLATIONS
// =================================================================================

const translations = {
    de: {
        appTitle: 'NovaWave - Musik Player', appSubtitle: 'Lokal & YouTube',
        nothingPlaying: 'Nichts spielt', unknownArtist: 'Unbekannter Künstler',
        loadFolder: 'Ordner laden', refreshFolder: 'Aktualisieren', searchPlaceholder: 'Playlist durchsuchen...', emptyPlaylist: 'Playlist ist leer. Lade einen Ordner!',
        track: 'Titel', tracks: 'Titel', playlistTitle: 'Playlist',
        downloaderTitle: 'Downloader', downloadButton: 'Download', urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optionaler Name...', statusReady: 'Bereit.', statusUrlMissing: 'URL fehlt!',
        statusFolderAbort: 'Ordnerauswahl abgebrochen.', statusStarting: 'Download startet...',
        statusSuccess: 'Download erfolgreich!', statusError: 'Fehler beim Download', statusTitleMissing: 'Titel fehlt!',
        statusProgress: (p) => `Lade... ${p}%`,
        settingsTitle: 'Einstellungen', defaultDownloadFolder: 'Standard-Download-Ordner',
        changeButton: 'Ändern', audioQuality: 'Audioqualität (Download)', qualityBest: 'Beste',
        qualityHigh: 'Hoch (192k)', qualityStandard: 'Standard (128k)',
        backgroundAnimation: 'Hintergrundanimation',
        blueTheme: 'Ocean Blue', darkTheme: 'Midnight', lightTheme: 'Daylight', blurpleTheme: 'Nebula', greyTheme: 'Graphite', darkroseTheme: 'Crimson', dinoloveTheme: 'Dinolove',
        shuffle: 'Zufallswiedergabe', previous: 'Zurück', playPause: 'Abspielen/Pause',
        next: 'Weiter', loop: 'Wiederholen', settings: 'Einstellungen', close: 'Schließen',
        toggleDownloader: 'Downloader umschalten', deleteSong: 'Song löschen',
        confirmDeleteTitle: 'Song löschen bestätigen',
        confirmDeleteMessage: 'Möchten Sie diesen Song wirklich unwiderruflich löschen?',
        confirmDeleteButton: 'Ja, löschen',
        cancelDeleteButton: 'Abbrechen',
        theme: 'Design', visualizer: 'Visualizer', sortBy: 'Sortieren nach',
        sortNewest: 'Zuletzt geändert', sortNameAZ: 'Name A-Z', sortNameZA: 'Name Z-A',
        sectionAppearance: 'Erscheinungsbild',
        themeDescription: 'Passe das Aussehen und die Farbgebung der App an.',
        backgroundAnimationDescription: 'Aktiviere oder deaktiviere die globale Hintergrundanimation.',
        sectionPlayer: 'Player',
        visualizerDescription: 'Aktiviere oder deaktiviere den Audio-Visualizer auf dem Player.',
        coverEmoji: 'Cover Emoji',
        coverEmojiDescription: 'Wähle ein Emoji, das auf dem Album-Cover angezeigt wird.',
        emojiNote: 'Musiknote',
        emojiDino: 'Dino',
        emojiCustom: 'Benutzerdefiniert',
        customEmoji: 'Benutzerdefiniertes Emoji',
        customEmojiDescription: 'Gib ein einzelnes Emoji ein.',
        enableDeleteSongs: 'Songs löschen aktivieren',
        enableDeleteSongsDescription: 'Ermöglicht das Löschen von Songs aus der Playlist und vom Dateisystem.',
        sectionDownloads: 'Downloads & Ordner',
        defaultDownloadFolderDescription: 'Lege den Standardordner für alle YouTube-Downloads fest.',
        audioQualityDescription: 'Wähle die Audioqualität für neue YouTube-Downloads.',
        autoLoadLastFolder: 'Zuletzt benutzten Ordner automatisch laden',
        autoLoadLastFolderDescription: 'Wenn aktiviert, wird der zuletzt benutzte Ordner beim Start der App automatisch geladen.',
        animOff: 'Aus', animFlow: 'Flow', animNebula: 'Nebula', animRainbow: 'Regenbogen',
        editTitle: 'Titel bearbeiten', editTitleDesc: 'Ändern Sie den Namen, der in der Playlist angezeigt wird.',
        currentTitle: 'Aktuell gespeichert', previewTitle: 'Vorschau (Neu)',
        saveBtn: 'Speichern', cancelBtn: 'Abbrechen',
        loadFolderDesc: 'Wählen Sie das Hauptverzeichnis Ihrer Musiksammlung.',
        refreshFolderDesc: 'Sollten neue Dateien im Ordner sein, aktualisieren Sie hier die Liste.',
    },
    en: {
        appTitle: 'NovaWave - Music Player', appSubtitle: 'Local & YouTube',
        nothingPlaying: 'Nothing Playing', unknownArtist: 'Unknown Artist',
        loadFolder: 'Load Folder', refreshFolder: 'Refresh', searchPlaceholder: 'Search playlist...', emptyPlaylist: 'Playlist is empty!',
        track: 'track', tracks: 'tracks', playlistTitle: 'Playlist',
        downloaderTitle: 'Downloader', downloadButton: 'Download', urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optional name...', statusReady: 'Ready.', statusUrlMissing: 'URL is missing!',
        statusFolderAbort: 'Folder selection aborted.', statusStarting: 'Starting download...',
        statusSuccess: 'Download successful!', statusError: 'Download error', statusTitleMissing: 'Title missing!',
        statusProgress: (p) => `Downloading... ${p}%`,
        settingsTitle: 'Settings', defaultDownloadFolder: 'Default Download Folder',
        changeButton: 'Change', audioQuality: 'Audio Quality (Download)', qualityBest: 'Best',
        qualityHigh: 'High (192k)', qualityStandard: 'Standard (128k)',
        backgroundAnimation: 'Background Animation',
        blueTheme: 'Ocean Blue', darkTheme: 'Midnight', lightTheme: 'Daylight', blurpleTheme: 'Nebula', greyTheme: 'Graphite', darkroseTheme: 'Crimson', dinoloveTheme: 'Dinolove',
        shuffle: 'Shuffle', previous: 'Previous', playPause: 'Play/Pause',
        next: 'Next', loop: 'Loop', settings: 'Settings', close: 'Close',
        toggleDownloader: 'Toggle Downloader', deleteSong: 'Delete Song',
        confirmDeleteTitle: 'Confirm Song Deletion',
        confirmDeleteMessage: 'Are you sure you want to permanently delete this song?',
        confirmDeleteButton: 'Yes, Delete',
        cancelDeleteButton: 'Cancel',
        theme: 'Theme', visualizer: 'Visualizer', sortBy: 'Sort By',
        sortNewest: 'Recently Modified', sortNameAZ: 'Name A-Z', sortNameZA: 'Name Z-A',
        sectionAppearance: 'Appearance',
        themeDescription: 'Customize the look and feel of the application.',
        backgroundAnimationDescription: 'Enable or disable the global background animation.',
        sectionPlayer: 'Player',
        visualizerDescription: 'Enable or disable the audio visualizer on the player.',
        coverEmoji: 'Cover Emoji',
        coverEmojiDescription: 'Choose an emoji to display on the album cover.',
        emojiNote: 'Music Note',
        emojiDino: 'Dino',
        emojiCustom: 'Custom',
        customEmoji: 'Custom Emoji',
        customEmojiDescription: 'Enter a single emoji.',
        enableDeleteSongs: 'Enable Song Deletion',
        enableDeleteSongsDescription: 'Allows deletion of songs from playlist and filesystem.',
        sectionDownloads: 'Downloads & Folders',
        defaultDownloadFolderDescription: 'Set the default folder for all YouTube downloads.',
        audioQualityDescription: 'Choose the audio quality for new YouTube downloads.',
        autoLoadLastFolder: 'Automatically load last used folder',
        autoLoadLastFolderDescription: 'If enabled, the last used folder will be loaded automatically when the app starts.',
        animOff: 'Off', animFlow: 'Flow', animNebula: 'Nebula', animRainbow: 'Rainbow',
        editTitle: 'Edit Title', editTitleDesc: 'Change the name shown in the playlist.',
        currentTitle: 'Currently Saved', previewTitle: 'Preview (New)',
        saveBtn: 'Save', cancelBtn: 'Cancel',
        loadFolderDesc: 'Select the main directory of your music collection.',
        refreshFolderDesc: 'If there are new files in the folder, refresh the list here.',
    }
};

function tr(key, ...args) {
    const lang = translations[currentLanguage] || translations.de;
    const text = (lang && lang[key]) || key;
    return typeof text === 'function' ? text(...args) : text;
}

// =================================================================================
// CORE PLAYER LOGIC
// =================================================================================

function playTrack(index) {
    if (index < 0 || index >= playlist.length) {
        isPlaying = false;
        updatePlayPauseUI();
        return;
    }
    currentIndex = index;
    const track = playlist[index];
    audio.src = `file://${track.path}`;
    audio.play().catch(e => console.error("Error playing audio:", e));
    isPlaying = true;
    updateUIForCurrentTrack();
}

function playNext() {
    let nextIndex = shuffleOn ? Math.floor(Math.random() * playlist.length) : currentIndex + 1;
    if (nextIndex >= playlist.length) {
        if (loopMode === 'all') nextIndex = 0;
        else { isPlaying = false; updatePlayPauseUI(); return; }
    }
    playTrack(nextIndex);
}

function playPrev() {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else playTrack(currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1);
}

// =================================================================================
// UI & DOM MANIPULATION
// =================================================================================

function updateUIForCurrentTrack() {
    if (currentIndex === -1 || !playlist[currentIndex]) {
        if (trackTitleEl) trackTitleEl.textContent = tr('nothingPlaying');
        if (trackArtistEl) trackArtistEl.textContent = '...';
        if (musicEmojiEl) musicEmojiEl.textContent = '🎵'; 
        updateActiveTrackInPlaylist();
        updateTrackTitleScroll();
        return;
    }
    const track = playlist[currentIndex];
    if (trackTitleEl) trackTitleEl.textContent = track.title;
    if (trackArtistEl) trackArtistEl.textContent = track.artist || tr('unknownArtist');
    
    // Nur Emoji-Funktion nutzen
    updateEmoji(settings.coverEmoji || 'note', settings.customCoverEmoji);

    updateActiveTrackInPlaylist();
    updateTrackTitleScroll();
}

function updatePlayPauseUI() {
    if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    updateActiveTrackInPlaylist();
}

function updateActiveTrackInPlaylist() {
    if (!playlistEl) return;
    const previousActive = playlistEl.querySelector('.track-row.active');
    if (previousActive) {
        previousActive.classList.remove('active');
        const indexVal = previousActive.dataset.index;
        const indexEl = previousActive.querySelector('.track-index');
        if (indexEl) indexEl.textContent = parseInt(indexVal) + 1; 
    }
    if (currentIndex !== -1) {
        const newActive = playlistEl.querySelector(`.track-row[data-index="${currentIndex}"]`);
        if (newActive) {
            newActive.classList.add('active');
            const indexEl = newActive.querySelector('.track-index');
            if (indexEl) {
                if (isPlaying) {
                    indexEl.innerHTML = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
                } else {
                    indexEl.textContent = currentIndex + 1;
                }
            }
        }
    }
}

function renderPlaylist() {
    if (!playlistEl) return;
    if (renderPlaylistRequestId) cancelAnimationFrame(renderPlaylistRequestId);
    
    playlistEl.innerHTML = '';
    if (playlist.length === 0) {
        playlistEl.innerHTML = `<div class="empty-state">${tr('emptyPlaylist')}</div>`;
        if (playlistInfoBar) playlistInfoBar.textContent = `0 ${tr('tracks')}`;
        return;
    }
    
    if (playlistInfoBar) playlistInfoBar.textContent = `${playlist.length} ${playlist.length === 1 ? tr('track') : tr('tracks')}`;

    let renderIndex = 0;
    const CHUNK_SIZE = 50;

    function renderChunk() {
        const fragment = document.createDocumentFragment();
        const limit = Math.min(renderIndex + CHUNK_SIZE, playlist.length);

        for (let i = renderIndex; i < limit; i++) {
            const track = playlist[i];
            const row = document.createElement('div');
            row.className = 'track-row';
            row.dataset.index = i;
            if (i === currentIndex) row.classList.add('active');

            const pi = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
            const db = deleteSongsEnabled ? `<button class="delete-track-btn" data-path="${track.path}" title="${tr('deleteSong')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></button>` : '';

            const indexDisplay = (isPlaying && i === currentIndex) ? pi : (i + 1);

            row.innerHTML = `
                <div class="track-index">${indexDisplay}</div>
                <div class="track-info-block">
                    <div class="track-title-small">${track.title}</div>
                    <div class="track-artist-small">${track.artist || tr('unknownArtist')}</div>
                </div>
                <div class="track-duration">${formatTime(track.duration)}</div>
                ${db}
            `;
            fragment.appendChild(row);
        }

        playlistEl.appendChild(fragment);
        renderIndex = limit;

        if (renderIndex < playlist.length) {
            renderPlaylistRequestId = requestAnimationFrame(renderChunk);
        }
    }
    renderChunk();
}

function applyTranslations() {
    const langElements = document.querySelectorAll('[data-lang-key]');
    langElements.forEach(el => {
        const text = tr(el.dataset.langKey);
        if (text) el.textContent = text;
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.langPlaceholder); });
    document.querySelectorAll('[data-lang-title]').forEach(el => { el.title = tr(el.dataset.langTitle); });
    document.title = tr('appTitle');
    updateUIForCurrentTrack();
    renderPlaylist();
}

function updateTrackTitleScroll() {
    if (!trackTitleEl) return;
    trackTitleEl.classList.remove('animating');
    trackTitleEl.style.setProperty('--scroll-dist', '0px');

    setTimeout(() => {
        const container = trackTitleEl.parentElement;
        if (!container) return;
        const containerWidth = container.offsetWidth;
        const textWidth = trackTitleEl.scrollWidth;
        const titleText = trackTitleEl.textContent || "";
        const isMiniMode = window.innerWidth < 450;

        if (textWidth > containerWidth || (isMiniMode && titleText.length > 15)) {
            const scrollDist = (textWidth - containerWidth + 40) * -1;
            trackTitleEl.style.setProperty('--scroll-dist', `${scrollDist}px`);
            trackTitleEl.classList.add('animating');
        }
    }, 350);
}

function updateEmoji(emojiType, customEmoji) {
    if (!musicEmojiEl) return;
    let emoji = '🎵';
    if (emojiType === 'note') emoji = '🎵';
    else if (emojiType === 'dino') emoji = '🦖';
    else if (emojiType === 'custom' && customEmoji) emoji = customEmoji.trim();
    musicEmojiEl.textContent = emoji;
}

async function handleDownload() {
    const url = ytUrlInput.value.trim();
    if (!url) { downloadStatusEl.textContent = tr('statusUrlMissing'); return; }
    downloadStatusEl.textContent = tr('statusStarting');
    if (downloadProgressFill) downloadProgressFill.style.width = '0%';
    try {
        const result = await window.api.downloadFromYouTube({ url, customName: ytNameInput.value.trim(), quality: qualitySelect.value });
        if (result.success) {
            downloadStatusEl.textContent = tr('statusSuccess');
            ytUrlInput.value = ''; ytNameInput.value = '';
        } else {
            downloadStatusEl.textContent = `${tr('statusError')}: ${result.error}`;
        }
    } catch (err) {
        downloadStatusEl.textContent = `${tr('statusError')}: ${err.message}`;
    }
}

function setupVisualizer() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
        visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
        console.error("Visualizer error:", e);
        visualizerEnabled = false;
    }
}

function startVisualizer() {
    if (!audioContext || visualizerRunning || !visualizerEnabled || !isPlaying) return;
    if (audioContext.state === 'suspended') audioContext.resume();
    visualizerRunning = true;
    drawVisualizer();
}

function stopVisualizer() {
    visualizerRunning = false;
    if (visualizerCanvas) {
        const ctx = visualizerCanvas.getContext('2d');
        ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
}

function drawVisualizer() {
    if (!visualizerRunning || !isPlaying || !visualizerEnabled) { visualizerRunning = false; return; }
    requestAnimationFrame(drawVisualizer);
    if (!visualizerDataArray) return;
    analyser.getByteFrequencyData(visualizerDataArray);
    const ctx = visualizerCanvas.getContext('2d');
    const { width, height } = visualizerCanvas;
    ctx.clearRect(0, 0, width, height);
    const bl = analyser.frequencyBinCount, hb = bl / 2, bw = (width / hb) / 2;
    let x = 0;
    const ac = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    for (let i = 0; i < hb; i++) {
        const bh = (visualizerDataArray[i] / 255) * height * 0.9;
        ctx.fillStyle = ac;
        ctx.fillRect(width / 2 + x, height - bh, bw, bh);
        ctx.fillRect(width / 2 - x - bw, height - bh, bw, bh);
        x += bw + 1;
    }
    if (musicEmojiEl && !isNaN(audio.currentTime)) {
        const blv = (visualizerDataArray[0] + visualizerDataArray[1]) / 2;
        const fy = Math.sin(audio.currentTime * 2) * 10;
        let js = 1;
        if (blv > 180) js = 1 + (Math.min((blv - 180) / 50, 1) * 0.15);
        musicEmojiEl.style.transform = `translateY(${fy}px) scale(${js})`;
    }
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => {
        if (!isNaN(audio.duration)) {
            const p = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = `${p}%`;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    });
    audio.addEventListener('durationchange', () => {
        if (durationEl) durationEl.textContent = isNaN(audio.duration) ? '0:00' : formatTime(audio.duration);
    });
    audio.addEventListener('play', () => {
        isPlaying = true; updatePlayPauseUI(); updateUIForCurrentTrack(); startVisualizer(); window.api.sendPlaybackState(true);
    });
    audio.addEventListener('pause', () => {
        isPlaying = false; updatePlayPauseUI(); stopVisualizer(); window.api.sendPlaybackState(false);
    });
    audio.addEventListener('ended', () => {
        stopVisualizer(); if (loopMode === 'one') { audio.currentTime = 0; audio.play(); } else playNext();
    });
        audio.addEventListener('volumechange', () => {
            currentVolume = audio.volume;
            if (volumeSlider) volumeSlider.value = currentVolume;
            if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);
            
            // Debounce volume saving to disk
            clearTimeout(window.volumeSaveTimeout);
            window.volumeSaveTimeout = setTimeout(() => {
                window.api.setSetting('volume', currentVolume);
            }, 500);
        });
}

async function loadSettings() {
    const s = await window.api.getSettings();
    if (s) settings = s;

    currentVolume = settings.volume !== undefined ? settings.volume : 0.2;
    audio.volume = currentVolume;
    shuffleOn = settings.shuffle || false;
    loopMode = settings.loop || 'off';
    currentLanguage = settings.language || 'de';
    sortMode = settings.sortMode || 'name';

    if (downloadFolderInput) downloadFolderInput.value = settings.downloadFolder || '';
    if (qualitySelect) qualitySelect.value = settings.audioQuality || 'best';
    
    if (animationSelect) {
        let mode = settings.animationMode || (settings.animationsEnabled !== false ? 'flow' : 'off');
        animationSelect.value = mode;
        applyAnimationSetting(mode);
    }
    
    if (themeSelect) themeSelect.value = settings.theme || 'blue';
    if (visualizerToggle) {
        visualizerToggle.checked = settings.visualizerEnabled !== false;
        visualizerEnabled = settings.visualizerEnabled !== false;
    }
    if (toggleDeleteSongs) {
        toggleDeleteSongs.checked = settings.deleteSongsEnabled || false;
        deleteSongsEnabled = settings.deleteSongsEnabled || false;
    }
    if (autoLoadLastFolderToggle) autoLoadLastFolderToggle.checked = settings.autoLoadLastFolder !== false;

    const et = settings.coverEmoji || 'note';
    const ce = settings.customCoverEmoji || '🎵';
    
    if (emojiSelect) emojiSelect.value = et;
    if (customEmojiInput) customEmojiInput.value = ce;
    if (customEmojiContainer) customEmojiContainer.style.display = et === 'custom' ? 'flex' : 'none';
    
    updateEmoji(et, ce);
    
    if (settings.currentFolderPath && (settings.autoLoadLastFolder !== false)) {
        currentFolderPath = settings.currentFolderPath;
        window.api.refreshMusicFolder(currentFolderPath).then(result => {
            if (result && result.tracks) {
                basePlaylist = result.tracks;
                sortPlaylist(sortMode);
                updateUIForCurrentTrack();
            }
        });
    }
    
    if (shuffleBtn) shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    if (loopBtn) {
        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');
        updateLoopIcon();
    }
    if (langButtons) langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === currentLanguage));
}

function updateLoopIcon() {
    if (!loopBtn) return;
    if (loopMode === 'one') {
        loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="17" font-size="10" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>`;
    } else {
        loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    }
}

function applyAnimationSetting(mode) {
    if (!backgroundAnimationEl) return;
    backgroundAnimationEl.className = 'background-animation';
    if (mode && mode !== 'off') {
        backgroundAnimationEl.style.display = 'block';
        backgroundAnimationEl.classList.add(`type-${mode}`);
    } else {
        backgroundAnimationEl.style.display = 'none';
    }
}

function formatTime(s) { if (isNaN(s)) return '0:00'; const m = Math.floor(s / 60), sc = Math.floor(s % 60).toString().padStart(2, '0'); return `${m}:${sc}`; }
function getVolumeIcon(v) {
    if (v === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    if (v < 0.5) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

function filterPlaylist(q) {
    playlist = !q ? [...basePlaylist] : basePlaylist.filter(t => t.title.toLowerCase().includes(q.toLowerCase()) || (t.artist && t.artist.toLowerCase().includes(q.toLowerCase())));
    renderPlaylist();
}

function sortPlaylist(m) {
    const srt = [...basePlaylist];
    if (m === 'name') srt.sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true }));
    else if (m === 'nameDesc') srt.sort((a, b) => b.title.localeCompare(a.title, 'de', { numeric: true }));
    else if (m === 'newest') srt.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    basePlaylist = srt; playlist = [...basePlaylist];
    renderPlaylist();
}

function showContextMenu(e, idx) {
    contextTrackIndex = idx;
    if (!contextMenu) return;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.display = 'block';
    const hcm = () => { contextMenu.style.display = 'none'; window.removeEventListener('click', hcm); };
    window.addEventListener('click', hcm);
}

function handleDeleteTrack(fp) {
    trackToDeletePath = fp;
    confirmDeleteOverlay.classList.add('visible');
    let c = 5;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${c})`;
    const ci = setInterval(() => {
        c--;
        if (c > 0) confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${c})`;
        else { clearInterval(ci); confirmDeleteBtn.textContent = tr('confirmDeleteButton'); confirmDeleteBtn.disabled = false; }
    }, 1000);
}

function setupEventListeners() {
    const bind = (el, ev, h) => { if (el && typeof el.addEventListener === 'function') el.addEventListener(ev, h); };
    
    bind(playBtn, 'click', () => { if (playlist.length === 0) return; if (isPlaying) audio.pause(); else (currentIndex === -1) ? playTrack(0) : audio.play(); });
    bind(nextBtn, 'click', playNext);
    bind(prevBtn, 'click', playPrev);
    
    bind(shuffleBtn, 'click', () => { shuffleOn = !shuffleOn; shuffleBtn.classList.toggle('mode-btn--active', shuffleOn); window.api.setSetting('shuffle', shuffleOn); });
    
    bind(loopBtn, 'click', () => {
        loopMode = loopMode === 'off' ? 'all' : (loopMode === 'all' ? 'one' : 'off');
        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');
        updateLoopIcon();
        window.api.setSetting('loop', loopMode);
    });
    
    bind(progressBar, 'click', (e) => {
        if (!isNaN(audio.duration)) {
            const r = progressBar.getBoundingClientRect();
            audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
        }
    });
    
    bind(volumeSlider, 'input', (e) => { audio.volume = parseFloat(e.target.value); });
    
    bind(openLibraryBtn, 'click', () => { libraryOverlay.classList.add('visible'); });
    bind(libraryCloseBtn, 'click', () => { libraryOverlay.classList.remove('visible'); });
    
    bind(loadFolderBtn, 'click', async () => {
        const r = await window.api.selectMusicFolder();
        if (r && r.tracks) {
            basePlaylist = r.tracks; playlist = [...basePlaylist]; currentIndex = -1;
            renderPlaylist(); updateUIForCurrentTrack(); currentFolderPath = r.folderPath;
            window.api.setSetting('currentFolderPath', currentFolderPath);
            libraryOverlay.classList.remove('visible');
        }
    });
    
    bind(refreshFolderBtn, 'click', async () => {
        if (!currentFolderPath) return;
        const r = await window.api.refreshMusicFolder(currentFolderPath);
        if (r && r.tracks) {
            basePlaylist = r.tracks;
            sortPlaylist(sortMode);
            updateUIForCurrentTrack();
            settingsOverlay.classList.remove('visible');
        }
    });
    
    let st;
    bind(searchInput, 'input', (e) => {
        clearTimeout(st);
        st = setTimeout(() => { filterPlaylist(e.target.value); }, 250);
    });
    
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.code) {
            case 'Space': e.preventDefault(); if (isPlaying) audio.pause(); else audio.play(); break;
            case 'ArrowRight': playNext(); break;
            case 'ArrowLeft': playPrev(); break;
            case 'ArrowUp': e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.05); break;
            case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); break;
        }
    });
    
    bind(toggleMiniMode, 'change', (e) => {
        if (e.target.checked) window.api.setWindowSize(340, 520);
        else window.api.setWindowSize(1300, 900);
    });
    
    bind(downloadBtn, 'click', handleDownload);
    
    window.api.onMediaControl((a) => {
        if (a === 'play-pause') { if (isPlaying) audio.pause(); else audio.play(); }
        else if (a === 'next') playNext();
        else if (a === 'previous') playPrev();
    });
    
    window.api.onDownloadProgress((d) => {
        if (d && typeof d.percent === 'number' && downloadProgressFill) {
            downloadProgressFill.style.width = `${d.percent}%`;
            downloadStatusEl.textContent = tr('statusProgress', d.percent.toFixed(1));
        }
    });
    
    if (langButtons) langButtons.forEach(btn => {
        bind(btn, 'click', () => {
            currentLanguage = btn.dataset.lang;
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTranslations();
            window.api.setSetting('language', currentLanguage);
        });
    });
    
    bind(themeSelect, 'change', (e) => {
        const th = e.target.value;
        document.documentElement.setAttribute('data-theme', th);
        window.api.setSetting('theme', th);
    });
    
    bind(sortSelect, 'change', (e) => {
        sortMode = e.target.value;
        window.api.setSetting('sortMode', sortMode);
        sortPlaylist(sortMode);
    });
    
    bind(settingsBtn, 'click', () => { settingsOverlay.classList.add('visible'); });
    bind(settingsCloseBtn, 'click', () => { settingsOverlay.classList.remove('visible'); });
    
    bind(changeFolderBtn, 'click', async () => {
        const nf = await window.api.selectFolder();
        if (nf) {
            if (downloadFolderInput) downloadFolderInput.value = nf;
            window.api.setSetting('downloadFolder', nf);
        }
    });
    
    bind(qualitySelect, 'change', (e) => window.api.setSetting('audioQuality', e.target.value));
    
    bind(visualizerToggle, 'change', (e) => {
        visualizerEnabled = e.target.checked;
        window.api.setSetting('visualizerEnabled', visualizerEnabled);
        if (visualizerEnabled) startVisualizer(); else stopVisualizer();
    });
    
    bind(animationSelect, 'change', (e) => {
        const m = e.target.value;
        window.api.setSetting('animationMode', m);
        applyAnimationSetting(m);
    });
    
    bind(autoLoadLastFolderToggle, 'change', (e) => window.api.setSetting('autoLoadLastFolder', e.target.checked));
    
    bind(emojiSelect, 'change', (e) => {
        const v = e.target.value;
        if (customEmojiContainer) customEmojiContainer.style.display = v === 'custom' ? 'flex' : 'none';
        window.api.setSetting('coverEmoji', v);
        updateEmoji(v, customEmojiInput ? customEmojiInput.value : '');
    });
    
    bind(customEmojiInput, 'input', (e) => {
        const v = e.target.value;
        window.api.setSetting('customCoverEmoji', v);
        updateEmoji('custom', v);
    });
    
    bind(toggleDeleteSongs, 'change', (e) => {
        deleteSongsEnabled = e.target.checked;
        window.api.setSetting('deleteSongsEnabled', deleteSongsEnabled);
        renderPlaylist();
    });
    
    bind(playlistEl, 'click', (e) => {
        const db = e.target.closest('.delete-track-btn');
        if (db) { e.stopPropagation(); handleDeleteTrack(db.dataset.path); return; }
        const row = e.target.closest('.track-row');
        if (row) playTrack(parseInt(row.dataset.index, 10));
    });
    
    bind(playlistEl, 'contextmenu', (e) => {
        const r = e.target.closest('.track-row');
        if (r) { e.preventDefault(); showContextMenu(e, parseInt(r.dataset.index, 10)); }
    });
    
    bind(toggleDownloaderBtn, 'click', () => { downloaderOverlay.classList.add('visible'); });
    bind(downloaderCloseBtn, 'click', () => { downloaderOverlay.classList.remove('visible'); });
    
    bind(contextMenuEditTitle, 'click', () => {
        if (contextTrackIndex === null) return;
        const t = playlist[contextTrackIndex];
        if (originalTitlePreview) originalTitlePreview.textContent = t.title;
        if (newTitlePreview) newTitlePreview.textContent = t.title;
        if (editTitleInput) editTitleInput.value = t.title;
        editTitleOverlay.classList.add('visible');
    });
    
    bind(editTitleCancelBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleSaveBtn, 'click', async () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        const t = playlist[contextTrackIndex];
        const nt = editTitleInput.value.trim();
        if (!nt) return;
        const r = await window.api.updateTitle(t.path, nt);
        if (r.success) {
            t.title = nt;
            const bt = basePlaylist.find(x => x.path === t.path);
            if (bt) bt.title = nt;
            renderPlaylist(); updateUIForCurrentTrack();
            editTitleOverlay.classList.remove('visible');
        }
    });
    
    bind(confirmDeleteCancelBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteBtn, 'click', async () => {
        if (!trackToDeletePath) return;
        const ctp = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null;
        const r = await window.api.deleteTrack(trackToDeletePath);
        if (r.success) {
            basePlaylist = basePlaylist.filter(x => x.path !== trackToDeletePath);
            playlist = playlist.filter(x => x.path !== trackToDeletePath);
            if (ctp) {
                if (trackToDeletePath === ctp) { audio.pause(); currentIndex = -1; audio.src = ''; updatePlayPauseUI(); }
                else { currentIndex = playlist.findIndex(x => x.path === ctp); }
            }
            renderPlaylist(); updateUIForCurrentTrack();
            confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null;
        }
    });
    
    new ResizeObserver(() => {
        if (visualizerCanvas && visualizerCanvas.width !== visualizerContainer.clientWidth) {
            visualizerCanvas.width = visualizerContainer.clientWidth;
        }
    }).observe(visualizerContainer);
    window.addEventListener('resize', updateTrackTitleScroll);
}

document.addEventListener('DOMContentLoaded', () => {
    $ = (s) => document.querySelector(s);
    
    // Assign all elements
    trackTitleEl = $('#track-title-large'); trackArtistEl = $('#track-artist-large'); musicEmojiEl = $('#music-emoji');
    currentTimeEl = $('#current-time'); durationEl = $('#duration'); progressBar = $('.progress-bar'); progressFill = $('.progress-fill');
    playBtn = $('#play-btn'); playIcon = $('#play-icon'); pauseIcon = $('#pause-icon'); prevBtn = $('#prev-btn'); nextBtn = $('#next-btn');
    loopBtn = $('#loop-btn'); shuffleBtn = $('#shuffle-btn'); volumeSlider = $('.volume-slider'); volumeIcon = $('.volume-icon');
    playlistEl = $('.playlist-scroll-area'); playlistInfoBar = $('.playlist-info-bar'); openLibraryBtn = $('#open-library-btn');
    libraryOverlay = $('#library-overlay'); libraryCloseBtn = $('#library-close-btn'); loadFolderBtn = $('#load-folder-btn');
    refreshFolderBtn = $('#refresh-folder-btn'); searchInput = $('.playlist-search-input'); sortSelect = $('#sort-select');
    ytUrlInput = $('#yt-url-input'); ytNameInput = $('#yt-name-input'); downloadBtn = $('#download-btn');
    downloaderOverlay = $('#downloader-overlay'); downloaderCloseBtn = $('#downloader-close-btn'); downloadStatusEl = $('.status-text');
    downloadProgressFill = $('.yt-progress-fill'); visualizerCanvas = $('#visualizer-canvas'); visualizerContainer = $('.visualizer-container');
    langButtons = document.querySelectorAll('.lang-btn'); settingsBtn = $('#settings-btn'); settingsOverlay = $('#settings-overlay');
    settingsCloseBtn = $('#settings-close-btn'); downloadFolderInput = $('#default-download-folder'); changeFolderBtn = $('#change-download-folder-btn');
    qualitySelect = $('#audio-quality-select'); themeSelect = $('#theme-select'); visualizerToggle = $('#toggle-visualizer');
    animationSelect = $('#animation-select'); backgroundAnimationEl = $('.background-animation'); emojiSelect = $('#emoji-select');
    customEmojiContainer = $('#custom-emoji-container'); customEmojiInput = $('#custom-emoji-input'); toggleDeleteSongs = $('#toggle-delete-songs');
    toggleDownloaderBtn = $('#toggle-downloader-btn'); contextMenu = $('#context-menu'); contextMenuEditTitle = $('#context-menu-edit-title');
    editTitleOverlay = $('#edit-title-overlay'); editTitleInput = $('#edit-title-input'); originalTitlePreview = $('#original-title-preview');
    newTitlePreview = $('#new-title-preview'); editTitleCancelBtn = $('#edit-title-cancel-btn'); editTitleSaveBtn = $('#edit-title-save-btn');
    confirmDeleteOverlay = $('#confirm-delete-overlay'); confirmDeleteBtn = $('#confirm-delete-btn'); confirmDeleteCancelBtn = $('#confirm-delete-cancel-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder'); toggleMiniMode = $('#toggle-mini-mode');

    // Close Modals on Overlay Click
    const overlays = [settingsOverlay, libraryOverlay, downloaderOverlay, editTitleOverlay, confirmDeleteOverlay];
    overlays.forEach(ov => { if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('visible'); }); });

    setupAudioEvents();
    setupEventListeners();
    setupVisualizer();

    loadSettings().then(() => {
        if (settings.theme) document.documentElement.setAttribute('data-theme', settings.theme);
        applyTranslations();
        audio.volume = currentVolume;
        if (volumeSlider) volumeSlider.value = currentVolume;
        if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);
    });
});