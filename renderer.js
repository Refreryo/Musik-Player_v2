// renderer.js

// Hilfsfunktion zum Abrufen von DOM-Elementen
const $ = (selector) => document.querySelector(selector);

// -------------------- Globaler Zustand --------------------
let playlist = [];
let basePlaylist = [];
let currentIndex = -1;
let isPlaying = false;
let audio = new Audio();
let currentVolume = 0.7;
let shuffleOn = false;
let loopMode = 'off'; // 'off', 'all', 'one'
let currentLanguage = 'de';
let currentTheme = 'blue';
let settings = {};

// Visualizer-Zustand
let audioContext;
let analyser;
let sourceNode;
let visualizerRunning = false;

// -------------------- DOM-Elemente --------------------
const trackTitleEl = $('#track-title-large');
const trackArtistEl = $('#track-artist-large');
const coverArtEl = $('#cover-art');
const coverPlaceholderEl = $('.cover-placeholder');
const currentTimeEl = $('#current-time');
const durationEl = $('#duration');
const progressBar = $('.progress-bar');
const progressFill = $('.progress-fill');
const playBtn = $('#play-btn');
const playIcon = $('#play-icon');
const pauseIcon = $('#pause-icon');
const prevBtn = $('#prev-btn');
const nextBtn = $('#next-btn');
const loopBtn = $('#loop-btn');
const shuffleBtn = $('#shuffle-btn');
const volumeSlider = $('.volume-slider');
const volumeIcon = $('.volume-icon');
const playlistEl = $('.playlist-scroll-area');
const playlistInfoBar = $('.playlist-info-bar');
const loadFolderBtn = $('#load-folder-btn');
const searchInput = $('.playlist-search-input');
const ytUrlInput = $('#yt-url-input');
const ytNameInput = $('#yt-name-input');
const downloadBtn = $('#download-btn');
const downloadStatusEl = $('.status-text');
const downloadProgressFill = $('.yt-progress-fill');
const visualizerCanvas = $('#visualizer-canvas');
const visualizerContainer = $('.visualizer-container');
const langButtons = document.querySelectorAll('.lang-btn');
const themeButtons = document.querySelectorAll('.theme-btn');

// Settings-Modal-Elemente
const settingsBtn = $('#settings-btn');
const settingsOverlay = $('#settings-overlay');
const settingsCloseBtn = $('#settings-close-btn');
const downloadFolderInput = $('#default-download-folder');
const changeFolderBtn = $('#change-download-folder-btn');
const qualitySelect = $('#audio-quality-select');
const animationToggle = $('#toggle-background-animation');
const backgroundAnimationEl = $('.background-animation');

// -------------------- Übersetzungen --------------------
const translations = {
    de: {
        playerTitle: 'Musik-Player',
        playerSubtitle: 'Lokal & YouTube',
        loadFolder: 'Ordner laden',
        searchPlaceholder: 'Playlist durchsuchen...',
        emptyPlaylist: 'Playlist ist leer. Lade einen Ordner!',
        track: 'Titel',
        tracks: 'Titel',
        downloaderTitle: 'Downloader',
        downloadButton: 'Download',
        urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optionaler Name...',
        statusReady: 'Bereit.',
        statusUrlMissing: 'URL fehlt!',
        statusFolderAbort: 'Ordnerauswahl abgebrochen.',
        statusStarting: 'Download startet...',
        statusSuccess: 'Download erfolgreich!',
        statusError: 'Fehler beim Download',
        statusProgress: (p) => `Lade... ${p}%`,
        // Settings
        settingsTitle: 'Einstellungen',
        defaultDownloadFolder: 'Standard-Download-Ordner',
        changeButton: 'Ändern',
        audioQuality: 'Audioqualität (Download)',
        qualityBest: 'Beste',
        qualityHigh: 'Hoch (192k)',
        qualityStandard: 'Standard (128k)',
        backgroundAnimation: 'Hintergrundanimation',
    },
    en: {
        playerTitle: 'Music Player',
        playerSubtitle: 'Local & YouTube',
        loadFolder: 'Load Folder',
        searchPlaceholder: 'Search playlist...',
        emptyPlaylist: 'Playlist is empty. Load a folder!',
        track: 'track',
        tracks: 'tracks',
        downloaderTitle: 'Downloader',
        downloadButton: 'Download',
        urlPlaceholder: 'YouTube URL...',
        renamePlaceholder: 'Optional name...',
        statusReady: 'Ready.',
        statusUrlMissing: 'URL is missing!',
        statusFolderAbort: 'Folder selection aborted.',
        statusStarting: 'Starting download...',
        statusSuccess: 'Download successful!',
        statusError: 'Download error',
        statusProgress: (p) => `Downloading... ${p}%`,
        // Settings
        settingsTitle: 'Settings',
        defaultDownloadFolder: 'Default Download Folder',
        changeButton: 'Change',
        audioQuality: 'Audio Quality (Download)',
        qualityBest: 'Best',
        qualityHigh: 'High (192k)',
        qualityStandard: 'Standard (128k)',
        backgroundAnimation: 'Background Animation',
    }
};

function tr(key, ...args) {
    const lang = translations[currentLanguage] || translations.de;
    const text = (lang && lang[key]) || key;
    return typeof text === 'function' ? text(...args) : text;
}

// -------------------- Player & UI --------------------
function playTrack(index) {
    if (index < 0 || index >= playlist.length) {
        isPlaying = false;
        updatePlayPauseUI();
        return;
    }
    currentIndex = index;
    const track = playlist[index];
    audio.src = `file://${track.path}`;
    audio.play();
    isPlaying = true;
    updateUIForCurrentTrack();
    if (visualizerCanvas && !visualizerRunning) startVisualizer();
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
    else {
        const prevIndex = currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1;
        playTrack(prevIndex);
    }
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => {
        const { currentTime, duration } = audio;
        if (isNaN(duration)) return;
        progressFill.style.width = `${(currentTime / duration) * 100}%`;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    });
    audio.addEventListener('ended', () => {
        if (loopMode === 'one') audio.play();
        else playNext();
    });
    audio.addEventListener('volumechange', () => {
        volumeIcon.innerHTML = getVolumeIcon(audio.volume);
    });
    audio.addEventListener('play', () => { isPlaying = true; updatePlayPauseUI(); });
    audio.addEventListener('pause', () => { isPlaying = false; updatePlayPauseUI(); });
}

function updateUIForCurrentTrack() {
    if (currentIndex === -1 || !playlist[currentIndex]) {
        trackTitleEl.textContent = 'Nichts spielt';
        trackArtistEl.textContent = '...';
        coverArtEl.style.display = 'none';
        coverPlaceholderEl.style.display = 'flex';
        renderPlaylist();
        return;
    }
    const track = playlist[currentIndex];
    trackTitleEl.textContent = track.title;
    trackArtistEl.textContent = track.artist || 'Unbekannter Künstler';
    window.api.getCover(track.path).then(coverUrl => {
        if (coverUrl) {
            coverArtEl.src = coverUrl;
            coverArtEl.style.display = 'block';
            coverPlaceholderEl.style.display = 'none';
        } else {
            coverArtEl.style.display = 'none';
            coverPlaceholderEl.style.display = 'flex';
        }
    });
    renderPlaylist();
}

function updatePlayPauseUI() {
    playIcon.style.display = isPlaying ? 'none' : 'block';
    pauseIcon.style.display = isPlaying ? 'block' : 'none';
}

function renderPlaylist() {
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
        
        const playingIcon = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 22v-20l18 10-18 10z"/></svg>`;
        row.innerHTML = `
            <div class="track-index">${isPlaying && index === currentIndex ? playingIcon : index + 1}</div>
            <div class="track-info-block">
                <div class="track-title-small">${track.title}</div>
                <div class="track-artist-small">${track.artist || '...'}</div>
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
        const key = el.getAttribute('data-lang-key');
        if (el.placeholder) el.placeholder = tr(key);
        else el.textContent = tr(key);
    });
    renderPlaylist();
    updateUIForCurrentTrack();
}

// -------------------- Downloader --------------------
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

// -------------------- Visualizer --------------------
function startVisualizer() {
    if (!visualizerCanvas || visualizerRunning) return;
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
    }
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
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

// -------------------- Settings --------------------
async function loadSettings() {
    settings = await window.api.getSettings();
    downloadFolderInput.value = settings.downloadFolder;
    qualitySelect.value = settings.audioQuality;
    animationToggle.checked = settings.animationsEnabled;
    applyAnimationSetting(settings.animationsEnabled);
}

function applyAnimationSetting(enabled) {
    backgroundAnimationEl.style.display = enabled ? 'block' : 'none';
}

// -------------------- Hilfsfunktionen --------------------
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

// -------------------- Event-Listener --------------------
function initEventListeners() {
    playBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        if (isPlaying) audio.pause();
        else {
            if (currentIndex === -1) playTrack(0);
            else audio.play();
        }
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    });
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    shuffleBtn.addEventListener('click', () => {
        shuffleOn = !shuffleOn;
        shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    });
    loopBtn.addEventListener('click', () => {
        const modes = ['off', 'all', 'one'];
        loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');
    });
    progressBar.addEventListener('click', (e) => {
        if (!isNaN(audio.duration)) {
            const rect = progressBar.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
        }
    });
    volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });
    loadFolderBtn.addEventListener('click', async () => {
        const result = await window.api.selectMusicFolder();
        if (result && result.tracks) {
            basePlaylist = result.tracks;
            playlist = [...basePlaylist];
            currentIndex = -1;
            playTrack(0);
        }
    });
    searchInput.addEventListener('input', (e) => filterPlaylist(e.target.value));
    downloadBtn.addEventListener('click', handleDownload);
    window.api.onDownloadProgress((data) => {
        if (data && typeof data.percent === 'number') {
            const percent = data.percent.toFixed(1);
            downloadProgressFill.style.width = `${percent}%`;
            downloadStatusEl.textContent = tr('statusProgress', percent);
        }
    });
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentLanguage = btn.dataset.lang;
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTranslations();
        });
    });
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTheme = btn.dataset.theme;
            document.documentElement.setAttribute('data-theme', currentTheme);
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Settings Listeners
    settingsBtn.addEventListener('click', () => { settingsOverlay.style.display = 'flex'; });
    settingsCloseBtn.addEventListener('click', () => { settingsOverlay.style.display = 'none'; });
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) settingsOverlay.style.display = 'none';
    });
    changeFolderBtn.addEventListener('click', async () => {
        const newFolder = await window.api.selectFolder();
        if (newFolder) {
            downloadFolderInput.value = newFolder;
            window.api.setSetting('downloadFolder', newFolder);
        }
    });
    qualitySelect.addEventListener('change', (e) => {
        window.api.setSetting('audioQuality', e.target.value);
    });
    animationToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        window.api.setSetting('animationsEnabled', enabled);
        applyAnimationSetting(enabled);
    });

    new ResizeObserver(() => {
        if (visualizerContainer.clientWidth > 0 && visualizerContainer.clientHeight > 0) {
            visualizerCanvas.width = visualizerContainer.clientWidth;
            visualizerCanvas.height = visualizerContainer.clientHeight;
        }
    }).observe(visualizerContainer);
}

// -------------------- Initialisierung --------------------
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    setupAudioEvents();
    loadSettings().then(() => {
        applyTranslations();
    });
    renderPlaylist();
    updatePlayPauseUI();
    audio.volume = currentVolume;
    volumeSlider.value = currentVolume;
});