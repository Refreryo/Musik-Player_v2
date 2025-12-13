// renderer.js - v2.2

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

// Visualizer State
let audioContext, analyser, sourceNode;
let visualizerRunning = false;

// DOM Elements (will be assigned on DOMContentLoaded)
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, animationToggle, backgroundAnimationEl;

// =================================================================================
// TRANSLATIONS
// =================================================================================

const translations = {
    de: {
        appTitle: 'NovaWave - Musik Player', appSubtitle: 'Lokal & YouTube',
        nothingPlaying: 'Nichts spielt', unknownArtist: 'Unbekannter Künstler',
        loadFolder: 'Ordner laden', searchPlaceholder: 'Playlist durchsuchen...',
        emptyPlaylist: 'Playlist ist leer. Lade einen Ordner!',
        track: 'Titel', tracks: 'Titel', playlistTitle: 'Playlist',
        downloaderTitle: 'Downloader', downloadButton: 'Download', urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optionaler Name...', statusReady: 'Bereit.', statusUrlMissing: 'URL fehlt!',
        statusFolderAbort: 'Ordnerauswahl abgebrochen.', statusStarting: 'Download startet...',
        statusSuccess: 'Download erfolgreich!', statusError: 'Fehler beim Download',
        statusProgress: (p) => `Lade... ${p}%`,
        settingsTitle: 'Einstellungen', defaultDownloadFolder: 'Standard-Download-Ordner',
        changeButton: 'Ändern', audioQuality: 'Audioqualität (Download)', qualityBest: 'Beste',
        qualityHigh: 'Hoch (192k)', qualityStandard: 'Standard (128k)',
        backgroundAnimation: 'Hintergrundanimation',
        blueTheme: 'Blau', darkTheme: 'Dunkel', lightTheme: 'Hell', blurpleTheme: 'Blurple', greyTheme: 'Grau',
        shuffle: 'Zufallswiedergabe', previous: 'Zurück', playPause: 'Abspielen/Pause',
        next: 'Weiter', loop: 'Wiederholen', settings: 'Einstellungen', close: 'Schließen',
        theme: 'Design', visualizer: 'Visualizer', sortBy: 'Sortieren nach',
        sortNewest: 'Zuletzt geändert', sortNameAZ: 'Name A-Z', sortNameZA: 'Name Z-A',
    },
    en: {
        appTitle: 'NovaWave - Music Player', appSubtitle: 'Local & YouTube',
        nothingPlaying: 'Nothing Playing', unknownArtist: 'Unknown Artist',
        loadFolder: 'Load Folder', searchPlaceholder: 'Search playlist...',
        emptyPlaylist: 'Playlist is empty. Load a folder!',
        track: 'track', tracks: 'tracks', playlistTitle: 'Playlist',
        downloaderTitle: 'Downloader', downloadButton: 'Download', urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optional name...', statusReady: 'Ready.', statusUrlMissing: 'URL is missing!',
        statusFolderAbort: 'Folder selection aborted.', statusStarting: 'Starting download...',
        statusSuccess: 'Download successful!', statusError: 'Download error',
        statusProgress: (p) => `Downloading... ${p}%`,
        settingsTitle: 'Settings', defaultDownloadFolder: 'Default Download Folder',
        changeButton: 'Change', audioQuality: 'Audio Quality (Download)', qualityBest: 'Best',
        qualityHigh: 'High (192k)', qualityStandard: 'Standard (128k)',
        backgroundAnimation: 'Background Animation',
        blueTheme: 'Blue', darkTheme: 'Dark', lightTheme: 'Light', blurpleTheme: 'Blurple', greyTheme: 'Grey',
        shuffle: 'Shuffle', previous: 'Previous', playPause: 'Play/Pause',
        next: 'Next', loop: 'Loop', settings: 'Settings', close: 'Close',
        theme: 'Theme', visualizer: 'Visualizer', sortBy: 'Sort By',
        sortNewest: 'Recently Modified', sortNameAZ: 'Name A-Z', sortNameZA: 'Name Z-A',
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
    if (!visualizerRunning) startVisualizer();
}

function playNext() {
    let nextIndex;
    if (shuffleOn) {
        nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= playlist.length) {
            if (loopMode === 'all') nextIndex = 0;
            else { isPlaying = false; updatePlayPauseUI(); return; }
        }
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
        trackTitleEl.textContent = tr('nothingPlaying');
        trackArtistEl.textContent = '...';
        renderPlaylist();
        return;
    }
    const track = playlist[currentIndex];
    trackTitleEl.textContent = track.title;
    trackArtistEl.textContent = track.artist || tr('unknownArtist');
    renderPlaylist();
}

function updatePlayPauseUI() {
    playIcon.style.display = isPlaying ? 'none' : 'block';
    pauseIcon.style.display = isPlaying ? 'block' : 'none';
}

function renderPlaylist() {
    if (!playlistEl) return;
    playlistEl.innerHTML = '';
    if (playlist.length === 0) {
        playlistEl.innerHTML = `<div class="empty-state">${tr('emptyPlaylist')}</div>`;
        playlistInfoBar.textContent = `0 ${tr('tracks')}`;
        return;
    }
    const fragment = document.createDocumentFragment();
    playlist.forEach((track, index) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        if (index === currentIndex) row.classList.add('active');
        const playingIcon = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        row.innerHTML = `
            <div class="track-index">${isPlaying && index === currentIndex ? playingIcon : index + 1}</div>
            <div class="track-info-block">
                <div class="track-title-small">${track.title}</div>
                <div class="track-artist-small">${track.artist || tr('unknownArtist')}</div>
            </div>
            <div class="track-duration">${formatTime(track.duration)}</div>
        `;
        row.addEventListener('click', () => playTrack(index));
        fragment.appendChild(row);
    });
    playlistEl.appendChild(fragment);
    const trackCount = playlist.length;
    playlistInfoBar.textContent = `${trackCount} ${trackCount === 1 ? tr('track') : tr('tracks')}`;
}

function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        if (el.tagName === 'OPTION') {
            el.textContent = tr(el.dataset.langKey);
        } else {
            el.textContent = tr(el.dataset.langKey);
        }
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => el.placeholder = tr(el.dataset.langPlaceholder));
    document.querySelectorAll('[data-lang-title]').forEach(el => el.title = tr(el.dataset.langTitle));
    document.title = tr('appTitle');
    updateUIForCurrentTrack();
    renderPlaylist();
}

// =================================================================================
// DOWNLOADER
// =================================================================================

async function handleDownload() {
    const url = ytUrlInput.value.trim();
    if (!url) {
        downloadStatusEl.textContent = tr('statusUrlMissing');
        return;
    }
    downloadStatusEl.textContent = tr('statusStarting');
    downloadProgressFill.style.width = '0%';
    try {
        const result = await window.api.downloadFromYouTube({
            url,
            customName: ytNameInput.value.trim(),
            quality: qualitySelect.value,
        });
        if (result.success) {
            downloadStatusEl.textContent = tr('statusSuccess');
            ytUrlInput.value = '';
            ytNameInput.value = '';
        } else {
            downloadStatusEl.textContent = `${tr('statusError')}: ${result.error}`;
        }
    } catch (err) {
        downloadStatusEl.textContent = `${tr('statusError')}: ${err.message}`;
    }
}

// =================================================================================
// VISUALIZER
// =================================================================================

function startVisualizer() {
    if (visualizerRunning || !visualizerEnabled) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
    visualizerRunning = true;
    drawVisualizer();
}

function drawVisualizer() {
    if (!visualizerRunning || !isPlaying) {
        visualizerRunning = false;
        return;
    }
    requestAnimationFrame(drawVisualizer);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const ctx = visualizerCanvas.getContext('2d');
    const { width, height } = visualizerCanvas;
    ctx.clearRect(0, 0, width, height);
    const barWidth = (width / bufferLength) * 1.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.9;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

// Attach audio DOM event listeners for playback control and UI updates
function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => {
        if (!isNaN(audio.duration)) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('durationchange', () => {
        durationEl.textContent = isNaN(audio.duration) ? '0:00' : formatTime(audio.duration);
    });

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayPauseUI();
        updateUIForCurrentTrack();
        if (!visualizerRunning) startVisualizer();
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayPauseUI();
    });

    audio.addEventListener('ended', () => {
        if (loopMode === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            playNext();
        }
    });

    audio.addEventListener('volumechange', () => {
        currentVolume = audio.volume;
        volumeSlider.value = currentVolume;
        volumeIcon.innerHTML = getVolumeIcon(currentVolume);
    });

    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
    });
}

// =================================================================================
// SETTINGS
// =================================================================================

async function loadSettings() {
    settings = await window.api.getSettings();
    downloadFolderInput.value = settings.downloadFolder;
    qualitySelect.value = settings.audioQuality;
    animationToggle.checked = settings.animationsEnabled;
    themeSelect.value = settings.theme || 'blue';
    visualizerToggle.checked = settings.visualizerEnabled !== false;
    visualizerEnabled = settings.visualizerEnabled !== false;
    applyAnimationSetting(settings.animationsEnabled);
}

function applyAnimationSetting(enabled) {
    backgroundAnimationEl.style.display = enabled ? 'block' : 'none';
}

// =================================================================================
// HELPERS & EVENT LISTENERS
// =================================================================================

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function getVolumeIcon(volume) {
    if (volume === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    if (volume < 0.5) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

function filterPlaylist(query) {
    playlist = !query ? [...basePlaylist] : basePlaylist.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || (t.artist && t.artist.toLowerCase().includes(query.toLowerCase())));
    const currentTrack = basePlaylist[currentIndex];
    currentIndex = currentTrack ? playlist.findIndex(t => t.path === currentTrack.path) : -1;
    renderPlaylist();
}

function sortPlaylist(mode) {
    const sorted = [...basePlaylist];
    if (mode === 'name') {
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true }));
    } else if (mode === 'nameDesc') {
        sorted.sort((a, b) => b.title.localeCompare(a.title, 'de', { numeric: true }));
    } else if (mode === 'newest') {
        // Sort by modified time (newest first) - requires mtime in track data
        sorted.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    }
    basePlaylist = sorted;
    playlist = [...basePlaylist];
    const currentTrack = currentIndex >= 0 ? playlist[currentIndex] : null;
    currentIndex = currentTrack ? playlist.findIndex(t => t.path === currentTrack.path) : -1;
    renderPlaylist();
}
function setupEventListeners() {
    // Safe bind helper for optional elements
    const bind = (el, ev, handler) => { if (el && typeof el.addEventListener === 'function') el.addEventListener(ev, handler); };

    bind(playBtn, 'click', () => {
        if (playlist.length === 0) return;
        if (isPlaying) audio.pause();
        else { (currentIndex === -1) ? playTrack(0) : audio.play(); }
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    });
    bind(nextBtn, 'click', playNext);
    bind(prevBtn, 'click', playPrev);
    bind(shuffleBtn, 'click', () => {
        shuffleOn = !shuffleOn;
        shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    });
    bind(loopBtn, 'click', () => {
        loopMode = loopMode === 'off' ? 'all' : (loopMode === 'all' ? 'one' : 'off');
        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');
    });
    bind(progressBar, 'click', (e) => {
        if (!isNaN(audio.duration)) {
            const rect = progressBar.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
        }
    });
    bind(volumeSlider, 'input', (e) => { audio.volume = parseFloat(e.target.value); });
    bind(loadFolderBtn, 'click', async () => {
        const result = await window.api.selectMusicFolder();
        if (result && result.tracks) {
            basePlaylist = result.tracks;
            playlist = [...basePlaylist];
            currentIndex = -1;
            renderPlaylist();
            updateUIForCurrentTrack();
        }
    });
    bind(searchInput, 'input', (e) => filterPlaylist(e.target.value));
    bind(downloadBtn, 'click', handleDownload);
    window.api.onDownloadProgress((data) => {
        if (data && typeof data.percent === 'number') {
            downloadProgressFill.style.width = `${data.percent.toFixed(1)}%`;
            downloadStatusEl.textContent = tr('statusProgress', data.percent.toFixed(1));
        }
    });
    langButtons.forEach(btn => {
        bind(btn, 'click', () => {
            currentLanguage = btn.dataset.lang;
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTranslations();
        });
    });
    bind(themeSelect, 'change', (e) => {
        const theme = e.target.value;
        document.documentElement.setAttribute('data-theme', theme);
        window.api.setSetting('theme', theme);
    });
    bind(sortSelect, 'change', (e) => {
        sortMode = e.target.value;
        sortPlaylist(sortMode);
    });
    bind(settingsBtn, 'click', () => { settingsOverlay.style.display = 'flex'; });
    bind(settingsCloseBtn, 'click', () => { settingsOverlay.style.display = 'none'; });
    bind(settingsOverlay, 'click', (e) => { if (e.target === settingsOverlay) settingsOverlay.style.display = 'none'; });
    bind(changeFolderBtn, 'click', async () => {
        const newFolder = await window.api.selectFolder();
        if (newFolder) {
            downloadFolderInput.value = newFolder;
            window.api.setSetting('downloadFolder', newFolder);
        }
    });
    bind(qualitySelect, 'change', (e) => window.api.setSetting('audioQuality', e.target.value));
    bind(visualizerToggle, 'change', (e) => {
        visualizerEnabled = e.target.checked;
        window.api.setSetting('visualizerEnabled', visualizerEnabled);
        if (!visualizerEnabled) {
            visualizerRunning = false;
            const ctx = visualizerCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
    });
    bind(animationToggle, 'change', (e) => {
        const enabled = e.target.checked;
        window.api.setSetting('animationsEnabled', enabled);
        applyAnimationSetting(enabled);
    });
    new ResizeObserver(() => {
        if(visualizerCanvas.width !== visualizerContainer.clientWidth) {
            visualizerCanvas.width = visualizerContainer.clientWidth;
        }
    }).observe(visualizerContainer);
}

// =================================================================================
// APP INITIALIZATION
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements
    $ = (selector) => document.querySelector(selector);
    trackTitleEl = $('#track-title-large');
    trackArtistEl = $('#track-artist-large');
    musicEmojiEl = $('#music-emoji');
    currentTimeEl = $('#current-time');
    durationEl = $('#duration');
    progressBar = $('.progress-bar');
    progressFill = $('.progress-fill');
    playBtn = $('#play-btn');
    playIcon = $('#play-icon');
    pauseIcon = $('#pause-icon');
    prevBtn = $('#prev-btn');
    nextBtn = $('#next-btn');
    loopBtn = $('#loop-btn');
    shuffleBtn = $('#shuffle-btn');
    volumeSlider = $('.volume-slider');
    volumeIcon = $('.volume-icon');
    playlistEl = $('.playlist-scroll-area');
    playlistInfoBar = $('.playlist-info-bar');
    loadFolderBtn = $('#load-folder-btn');
    searchInput = $('.playlist-search-input');
    sortSelect = $('#sort-select');
    ytUrlInput = $('#yt-url-input');
    ytNameInput = $('#yt-name-input');
    downloadBtn = $('#download-btn');
    downloadStatusEl = $('.status-text');
    downloadProgressFill = $('.yt-progress-fill');
    visualizerCanvas = $('#visualizer-canvas');
    visualizerContainer = $('.visualizer-container');
    langButtons = document.querySelectorAll('.lang-btn');
    settingsBtn = $('#settings-btn');
    settingsOverlay = $('#settings-overlay');
    settingsCloseBtn = $('#settings-close-btn');
    downloadFolderInput = $('#default-download-folder');
    changeFolderBtn = $('#change-download-folder-btn');
    qualitySelect = $('#audio-quality-select');
    themeSelect = $('#theme-select');
    visualizerToggle = $('#toggle-visualizer');
    animationToggle = $('#toggle-background-animation');
    backgroundAnimationEl = $('.background-animation');

    // Initial setup
    setupAudioEvents();
    setupEventListeners();
    loadSettings().then(() => {
        // Apply theme from settings
        const theme = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', theme);
        if (themeSelect) themeSelect.value = theme;
        applyTranslations();
    });
    renderPlaylist();
    updatePlayPauseUI();
    audio.volume = currentVolume;
    volumeSlider.value = currentVolume;
    volumeIcon.innerHTML = getVolumeIcon(currentVolume);
});