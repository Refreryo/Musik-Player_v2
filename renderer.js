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
let currentVisualizerStyle = 'bars';
let visSensitivity = 1.5;
let sleepTimerId = null;
let lastNotifiedPath = null;

// Visualizer State
let audioContext, analyser, sourceNode, bassFilter, trebleFilter, reverbNode, reverbGain;
let visualizerDataArray;
let visualizerRunning = false;

// DOM Elements
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, openLibraryBtn, libraryOverlay, libraryCloseBtn, refreshFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloaderOverlay, downloaderCloseBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, visualizerStyleSelect, visualizerSensitivity, sleepTimerSelect, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDeleteSongs, toggleDownloaderBtn, contextMenu, contextMenuEditTitle, editTitleOverlay, editTitleInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, editTitleCloseBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, confirmDeleteCloseBtn, autoLoadLastFolderToggle, toggleMiniMode, notificationBar, notificationMessage, notificationTimeout, accentColorPicker, toggleFocusModeBtn, dropZone, toggleEnableFocus, toggleEnableDrag, toggleUseCustomColor, accentColorContainer, speedSlider, speedValue, snowInterval;

let trackToDeletePath = null;
let bassBoostToggle, bassBoostSlider, bassBoostValueEl, bassBoostContainer;
let trebleBoostToggle, trebleBoostSlider, trebleBoostValueEl, trebleBoostContainer;
let reverbToggle, reverbSlider, reverbValueEl, reverbContainer;
let toggleCinemaMode, btnExportPlaylist;
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
        themeBlue: 'Standard Blau', themeDark: 'Mitternachts-Lila', themeLight: 'Hellblau', themePurple: 'Blurple', themeGrey: 'Schiefergrau', themeRose: 'Tiefrot', themeDino: 'Dino Grün', themeXmas: 'Weihnachten',
        shuffle: 'Zufallswiedergabe', previous: 'Zurück', playPause: 'Abspielen/Pause',
        next: 'Weiter', loop: 'Wiederholen', settings: 'Einstellungen', close: 'Schließen',
        toggleDownloader: 'Downloader umschalten', deleteSong: 'Song löschen',
        confirmDeleteTitle: 'Song löschen bestätigen',
        confirmDeleteMessage: 'Möchten Sie diesen Song wirklich unwiderruflich löschen?',
        confirmDeleteButton: 'Ja, löschen',
        cancelDeleteButton: 'Abbrechen',
        theme: 'Design', visualizer: 'Visualizer', sortBy: 'Sortieren nach',
        sortNameAZ: 'Name A-Z', sortNameZA: 'Name Z-A', sortNewest: 'Zuletzt geändert',
        visualizerStyle: 'Visualizer-Stil',
        visualizerStyleDescription: 'Wähle einen visuellen Effekt für den Player.',
        visBars: 'Balken (Classic)',
        visCircle: 'Energie-Ring',
        visPrism: 'Prisma-Wellen',
        visDino: 'Dino-Retro-Jump',
        visRetro: 'Retro-Pixel',
        visSensitivity: 'Visualizer-Empfindlichkeit',
        visSensitivityDesc: 'Stelle ein, wie stark der Visualizer auf Musik reagiert.',
        sleepTimer: 'Sleep Timer',
        sleepTimerDesc: 'Stoppt die Musik automatisch nach der gewählten Zeit.',
        timerOff: 'Aus',
        nowPlaying: 'Jetzt läuft',
        customColor: 'Eigene Akzentfarbe',
        customColorDesc: 'Wähle deine Lieblingsfarbe für das Interface.',
        focusMode: 'Fokus-Modus umschalten',
        dropFiles: 'Musik oder Ordner hierher ziehen',
        sectionExtras: 'Extras & Spezialfunktionen',
        enableFocusOption: 'Fokus-Modus Button anzeigen',
        enableFocusOptionDesc: 'Blendet den kleinen Button am Visualizer ein oder aus.',
        enableDragOption: 'Drag & Drop aktivieren',
        enableDragOptionDesc: 'Ermöglicht das Hinzufügen von Musik durch Reinziehen.',
        useCustomColorOption: 'Eigene Akzentfarbe nutzen',
        useCustomColorOptionDesc: 'Wende deine gewählte Farbe an oder nutze Theme-Standards.',
        coverEmoji: 'Cover-Symbol',
        coverEmojiDescription: 'Wähle ein Emoji für das Album-Cover in der Mitte.',
        emojiNote: 'Musiknote',
        emojiDino: 'Dino',
        emojiGift: 'Weihnachtsgeschenk',
        emojiCustom: 'Benutzerdefiniert',
        customEmoji: 'Benutzerdefiniertes Emoji',
        customEmojiDescription: 'Gib ein einzelnes Emoji ein (z.B. per Win + .).',
        enableDeleteSongs: 'Song-Löschen aktivieren',
        enableDeleteSongsDescription: 'Ermöglicht das unwiderrufliche Löschen von Titeln.',
        autoLoadLastFolder: 'Zuletzt benutzten Ordner automatisch laden',
        autoLoadLastFolderDescription: 'Lädt den letzten Ordner automatisch beim Start der App.',
        sectionAppearance: 'Erscheinungsbild & Design',
        themeDescription: 'Passe das Aussehen und die Farbgebung der App an.',
        backgroundAnimationDescription: 'Aktiviere oder deaktiviere die Hintergrundanimation.',
        sectionPlayer: 'Player-Einstellungen',
        visualizerDescription: 'Aktiviere oder deaktiviere den Audio-Visualizer.',
        sectionDownloads: 'Downloads & Ordner',
        defaultDownloadFolderDescription: 'Lege den Standardordner für YouTube-Downloads fest.',
        audioQualityDescription: 'Wähle die Audioqualität für neue YouTube-Downloads.',
        refreshFolder: 'Ordner aktualisieren',
        refreshFolderDesc: 'Sucht nach neuen Dateien im aktuell geladenen Ordner.',
        animOff: 'Aus', animFlow: 'Flow', animNebula: 'Nebula', animRainbow: 'Regenbogen', animStellar: 'Stellar', animAurora: 'Aurora', animXmas: 'Schneefall',
        editTitle: 'Titel bearbeiten', editTitleDesc: 'Ändern Sie den Anzeigenamen in der Playlist.',
        currentTitle: 'Aktuell gespeichert', previewTitle: 'Vorschau (Neu)',
        saveBtn: 'Speichern', cancelBtn: 'Abbrechen',
        loadFolderDesc: 'Wählen Sie das Hauptverzeichnis Ihrer Musiksammlung.',
        titleUpdated: 'Titel erfolgreich geändert!',
        songDeleted: 'Song erfolgreich gelöscht!',
        downloaderSectionTitle: 'YouTube Video zu MP3',
        tracksAdded: (count) => `${count} Titel hinzugefügt`,
        editTitleInputPlaceholder: 'Titel eingeben...',
        miniLabel: 'MINI',
        miniModeTitle: 'Mini-Player Modus',
        dropZoneText: 'Musik hierher ziehen...',
        playbackSpeed: 'Abspielgeschwindigkeit',
        playbackSpeedDesc: 'Passe die Geschwindigkeit an (0.5x - 2.0x).',
        focusActiveNotify: 'Fokus-Modus aktiv (Klicke oben rechts zum Verlassen)',
        showInFolder: 'Im Ordner anzeigen',
        sleepTimerNotify: (m) => `Sleep Timer aktiviert: ${m} Minuten`,
        sleepTimerStopped: 'Sleep Timer: Musik gestoppt.',
        bassBoost: 'Bass Boost', bassBoostDesc: 'Verstärke die tiefen Frequenzen.', bassBoostLevel: 'Intensität',
        trebleBoost: 'Crystalizer', trebleBoostDesc: 'Verstärke die Höhen für mehr Klarheit.', trebleBoostLevel: 'Intensität',
        reverb: 'Reverb', reverbDesc: 'Räumlicher Hall-Effekt.', reverbLevel: 'Mix',
        sectionAudioExtras: 'Audio-Extras', sectionExtras: 'Extras & Tools',
        cinemaMode: 'Kino-Modus', cinemaModeDesc: 'Dimmt die Benutzeroberfläche für mehr Fokus.',
        exportPlaylist: 'Playlist exportieren', exportPlaylistDesc: 'Speichere die aktuelle Liste als Textdatei.',
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
        themeBlue: 'Standard Blue', themeDark: 'Midnight Purple', themeLight: 'Light Blue', themePurple: 'Blurple', themeGrey: 'Slate Grey', themeRose: 'Deep Rose', themeDino: 'Dino Green', themeXmas: 'Christmas',
        shuffle: 'Shuffle', previous: 'Previous', playPause: 'Play/Pause',
        next: 'Next', loop: 'Loop', settings: 'Settings', close: 'Close',
        toggleDownloader: 'Toggle Downloader', deleteSong: 'Delete Song',
        confirmDeleteTitle: 'Confirm Song Deletion',
        confirmDeleteMessage: 'Are you sure you want to permanently delete this song?',
        confirmDeleteButton: 'Yes, Delete',
        cancelDeleteButton: 'Cancel',
        theme: 'Theme', visualizer: 'Visualizer', sortBy: 'Sort By',
        sortNameAZ: 'Name A-Z', sortNameZA: 'Name Z-A', sortNewest: 'Recently Modified',
        visualizerStyle: 'Visualizer Style',
        visualizerStyleDescription: 'Choose a visual effect for the player.',
        visBars: 'Bars (Classic)',
        visCircle: 'Energy Ring',
        visPrism: 'Prism Waves',
        visDino: 'Dino-Retro-Jump',
        visRetro: 'Retro Pixels',
        visSensitivity: 'Visualizer Sensitivity',
        visSensitivityDesc: 'Adjust how much the visualizer reacts to the music.',
        sleepTimer: 'Sleep Timer',
        sleepTimerDesc: 'Automatically stops the music after the selected time.',
        timerOff: 'Off',
        nowPlaying: 'Now Playing',
        customColor: 'Custom Accent Color',
        customColorDesc: 'Choose your favorite color for the interface.',
        focusMode: 'Toggle Focus Mode',
        dropFiles: 'Drop music or folders here',
        sectionExtras: 'Extras & Special Features',
        enableFocusOption: 'Show Focus Mode Button',
        enableFocusOptionDesc: 'Toggle the visibility of the focus mode button on the visualizer.',
        enableDragOption: 'Enable Drag & Drop',
        enableDragOptionDesc: 'Allows adding music by dragging files into the window.',
        bassBoost: 'Bass Boost', bassBoostDesc: 'Enhance low frequencies.', bassBoostLevel: 'Intensity',
        trebleBoost: 'Crystalizer', trebleBoostDesc: 'Enhance highs for clarity.', trebleBoostLevel: 'Intensity',
        reverb: 'Reverb', reverbDesc: 'Spatial reverb effect.', reverbLevel: 'Mix',
        sectionAudioExtras: 'Audio Extras', sectionExtras: 'Extras & Tools',
        cinemaMode: 'Cinema Mode', cinemaModeDesc: 'Dims the UI for better focus.',
        exportPlaylist: 'Export Playlist', exportPlaylistDesc: 'Save current list as a text file.',
        useCustomColorOption: 'Use Custom Accent Color',
        useCustomColorOptionDesc: 'Apply your selected color or use theme defaults.',
        coverEmoji: 'Cover Emoji',
        coverEmojiDescription: 'Choose an emoji for the album cover in the center.',
        emojiNote: 'Music Note',
        emojiDino: 'Dino',
        emojiGift: 'Christmas Gift',
        emojiCustom: 'Custom',
        customEmoji: 'Custom Emoji',
        customEmojiDescription: 'Enter a single emoji (e.g. Win + .).',
        enableDeleteSongs: 'Enable Song Deletion',
        enableDeleteSongsDescription: 'Allows permanent deletion of songs from your system.',
        autoLoadLastFolder: 'Automatically load last used folder',
        autoLoadLastFolderDescription: 'Automatically loads the last used directory on startup.',
        sectionAppearance: 'Appearance & Design',
        themeDescription: 'Customize the look and feel of the application.',
        backgroundAnimationDescription: 'Enable or disable the background animation.',
        sectionPlayer: 'Player Settings',
        visualizerDescription: 'Enable or disable the audio visualizer.',
        sectionDownloads: 'Downloads & Folders',
        defaultDownloadFolderDescription: 'Set the default directory for all YouTube downloads.',
        audioQualityDescription: 'Choose the audio quality for YouTube downloads.',
        refreshFolder: 'Refresh Folder',
        refreshFolderDesc: 'Scan the current folder for new music files.',
        animOff: 'Off', animFlow: 'Flow', animNebula: 'Nebula', animRainbow: 'Rainbow', animStellar: 'Stellar', animAurora: 'Aurora', animXmas: 'Snowfall',
        editTitle: 'Edit Title', editTitleDesc: 'Change the display name in the playlist.',
        currentTitle: 'Currently Saved', previewTitle: 'Preview (New)',
        saveBtn: 'Save', cancelBtn: 'Cancel',
        loadFolderDesc: 'Select the main directory of your music collection.',
        titleUpdated: 'Title successfully changed!',
        songDeleted: 'Song successfully deleted!',
        downloaderSectionTitle: 'YouTube Video to MP3',
        tracksAdded: (count) => `${count} tracks added`,
        editTitleInputPlaceholder: 'Enter title...',
        miniLabel: 'MINI',
        miniModeTitle: 'Mini Player Mode',
        dropZoneText: 'Drop music here...',
        playbackSpeed: 'Playback Speed',
        playbackSpeedDesc: 'Adjust the playback rate (0.5x - 2.0x).',
        focusActiveNotify: 'Focus Mode active (Click top right to exit)',
        showInFolder: 'Show in Folder',
        sleepTimerNotify: (m) => `Sleep Timer enabled: ${m} minutes`,
        sleepTimerStopped: 'Sleep Timer: Music stopped.',
    }
};

function tr(key, ...args) {
    const langCode = currentLanguage || (settings && settings.language) || 'de';
    const lang = translations[langCode] || translations.de;
    const text = (lang && lang[key]) || (translations.de[key]) || key;
    return typeof text === 'function' ? text(...args) : text;
}

// =================================================================================
// CORE PLAYER LOGIC
// =================================================================================

function playTrack(index) {
    if (index < 0 || index >= playlist.length) { isPlaying = false; updatePlayPauseUI(); return; }
    currentIndex = index;
    const track = playlist[index];
    audio.src = `file://${track.path}`;
    const speed = speedSlider ? parseFloat(speedSlider.value) : 1.0;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
    audio.play().catch(e => console.error("Error playing audio:", e));
    isPlaying = true;
    updateUIForCurrentTrack();
}

function playNext() {
    let nextIndex = shuffleOn ? Math.floor(Math.random() * playlist.length) : currentIndex + 1;
    if (nextIndex >= playlist.length) { if (loopMode === 'all') nextIndex = 0; else { isPlaying = false; updatePlayPauseUI(); return; } }
    playTrack(nextIndex);
}

function playPrev() { if (audio.currentTime > 3) audio.currentTime = 0; else playTrack(currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1); }

// =================================================================================
// UI & DOM MANIPULATION
// =================================================================================

async function updateUIForCurrentTrack() {
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
    updateEmoji(settings.coverEmoji || 'note', settings.customCoverEmoji);
    updateActiveTrackInPlaylist();
    updateTrackTitleScroll();
    if (isPlaying && lastNotifiedPath !== track.path) { showNotification(`${tr('nowPlaying')}: ${track.title}`); lastNotifiedPath = track.path; }
}

function updatePlayPauseUI() { if (playIcon && pauseIcon) { playIcon.style.display = isPlaying ? 'none' : 'block'; pauseIcon.style.display = isPlaying ? 'block' : 'none'; } updateActiveTrackInPlaylist(); }

function updateActiveTrackInPlaylist() {
    if (!playlistEl) return;
    const previousActive = playlistEl.querySelector('.track-row.active');
    if (previousActive) { previousActive.classList.remove('active'); const indexEl = previousActive.querySelector('.track-index'); if (indexEl) indexEl.textContent = parseInt(previousActive.dataset.index) + 1; }
    if (currentIndex !== -1) {
        const newActive = playlistEl.querySelector(`.track-row[data-index="${currentIndex}"]`);
        if (newActive) {
            newActive.classList.add('active');
            const indexEl = newActive.querySelector('.track-index');
            if (indexEl) { if (isPlaying) { indexEl.innerHTML = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; } else { indexEl.textContent = currentIndex + 1; } }
        }
    }
}

function renderPlaylist() {
    if (!playlistEl) return;
    if (renderPlaylistRequestId) cancelAnimationFrame(renderPlaylistRequestId);
    playlistEl.innerHTML = '';
    if (playlist.length === 0) { playlistEl.innerHTML = `<div class="empty-state">${tr('emptyPlaylist')}</div>`; if (playlistInfoBar) playlistInfoBar.textContent = `0 ${tr('tracks')}`; return; }
    if (playlistInfoBar) playlistInfoBar.textContent = `${playlist.length} ${playlist.length === 1 ? tr('track') : tr('tracks')}`;
    let renderIndex = 0; const CHUNK_SIZE = 50;
    function renderChunk() {
        const fragment = document.createDocumentFragment(); const limit = Math.min(renderIndex + CHUNK_SIZE, playlist.length);
        for (let i = renderIndex; i < limit; i++) {
            const track = playlist[i], row = document.createElement('div');
            row.className = 'track-row'; row.dataset.index = i; if (i === currentIndex) row.classList.add('active');
            const pi = `<div class="playing-bars"><span></span><span></span><span></span></div>`;
            const db = deleteSongsEnabled ? `<button class="delete-track-btn" data-path="${track.path}" title="${tr('deleteSong')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></button>` : '';
            row.innerHTML = `<div class="track-index">${(isPlaying && i === currentIndex) ? pi : (i + 1)}</div><div class="track-info-block"><div class="track-title-small">${track.title}</div><div class="track-artist-small">${track.artist || tr('unknownArtist')}</div></div><div class="track-duration">${formatTime(track.duration)}</div>${db}`;
            fragment.appendChild(row);
        }
        playlistEl.appendChild(fragment); renderIndex = limit;
        if (renderIndex < playlist.length) renderPlaylistRequestId = requestAnimationFrame(renderChunk);
    }
    renderChunk();
}

function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(el => { const text = tr(el.dataset.langKey); if (text) el.textContent = text; });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.langPlaceholder); });
    document.querySelectorAll('[data-lang-title]').forEach(el => { el.title = tr(el.dataset.langTitle); });
    const dropZoneTextEl = $('#drop-zone p'); if (dropZoneTextEl) dropZoneTextEl.textContent = tr('dropZoneText');
    document.title = tr('appTitle'); updateUIForCurrentTrack(); renderPlaylist();
}

function updateTrackTitleScroll() {
    if (!trackTitleEl) return;
    trackTitleEl.classList.remove('animating'); trackTitleEl.style.setProperty('--scroll-dist', '0px');
    setTimeout(() => {
        const container = trackTitleEl.parentElement; if (!container) return;
        const containerWidth = container.offsetWidth, textWidth = trackTitleEl.scrollWidth, titleText = trackTitleEl.textContent || "", isMiniMode = window.innerWidth < 450;
        if (textWidth > containerWidth || (isMiniMode && titleText.length > 20)) {
            const scrollDist = (textWidth - containerWidth + 40) * -1;
            trackTitleEl.style.setProperty('--scroll-dist', `${scrollDist}px`); trackTitleEl.classList.add('animating');
        }
    }, 350);
}

function updateEmoji(emojiType, customEmoji) {
    if (!musicEmojiEl) return; let emoji = '🎵';
    if (emojiType === 'note') emoji = '🎵'; else if (emojiType === 'dino') emoji = '🦖'; else if (emojiType === 'gift') emoji = '🎁';
    else if (emojiType === 'custom' && customEmoji) emoji = customEmoji.trim();
    musicEmojiEl.textContent = emoji;
}

async function handleDownload() {
    const url = ytUrlInput.value.trim(); if (!url) { downloadStatusEl.textContent = tr('statusUrlMissing'); return; }
    downloadStatusEl.textContent = tr('statusStarting'); if (downloadProgressFill) downloadProgressFill.style.width = '0%';
    try {
        const result = await window.api.downloadFromYouTube({ url, customName: ytNameInput.value.trim(), quality: qualitySelect.value });
        if (result.success) { downloadStatusEl.textContent = tr('statusSuccess'); ytUrlInput.value = ''; ytNameInput.value = ''; }
        else { downloadStatusEl.textContent = `${tr('statusError')}: ${result.error}`; }
    } catch (err) { downloadStatusEl.textContent = `${tr('statusError')}: ${err.message}`; }
}

function setupVisualizer() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio); 
        analyser = audioContext.createAnalyser();
        
        // Filters
        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 120;
        bassFilter.gain.value = 0;

        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = 0;

        // Reverb
        reverbNode = audioContext.createConvolver();
        reverbNode.buffer = createReverbBuffer(2.0); // 2 seconds tail
        reverbGain = audioContext.createGain();
        reverbGain.gain.value = 0;

        analyser.fftSize = 256; 
        updateAnalyserSettings(); 
        
        // Graph: Source -> Bass -> Treble
        sourceNode.connect(bassFilter);
        bassFilter.connect(trebleFilter);

        // Treble -> Analyser (Dry Signal)
        trebleFilter.connect(analyser);

        // Treble -> Reverb -> ReverbGain -> Analyser (Wet Signal)
        trebleFilter.connect(reverbNode);
        reverbNode.connect(reverbGain);
        reverbGain.connect(analyser);

        analyser.connect(audioContext.destination);
        
        visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);
        updateAudioEffects();
    } catch (e) { console.error("Visualizer error:", e); visualizerEnabled = false; }
}

function createReverbBuffer(duration) {
    const rate = audioContext.sampleRate;
    const len = rate * duration;
    const buffer = audioContext.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
        const channel = buffer.getChannelData(c);
        for (let i = 0; i < len; i++) {
            // Noise with exponential decay
            channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
    }
    return buffer;
}

function updateAudioEffects() {
    if (!audioContext) return;
    const t = audioContext.currentTime;

    const bassOn = !!settings.bassBoostEnabled;
    const crystalOn = !!settings.trebleBoostEnabled;
    const reverbOn = !!settings.reverbEnabled;

    // Bass
    if (bassFilter) {
        const bg = bassOn ? (parseFloat(settings.bassBoostValue) || 6) : 0;
        bassFilter.gain.setTargetAtTime(bg, t, 0.1);
    }

    // Treble
    if (trebleFilter) {
        const tg = crystalOn ? (parseFloat(settings.trebleBoostValue) || 6) : 0;
        trebleFilter.gain.setTargetAtTime(tg, t, 0.1);
    }

    // Reverb
    if (reverbGain) {
        const val = parseFloat(settings.reverbValue) || 30;
        const rg = reverbOn ? (val / 100) : 0;
        reverbGain.gain.setTargetAtTime(rg, t, 0.1);
    }

    // Update Unified Feature Indicator
    const mainIndicator = document.getElementById('active-features-indicator');
    if (mainIndicator) {
        mainIndicator.classList.toggle('active', bassOn || crystalOn || reverbOn);
    }

    // Update Modal Items
    const mb = document.getElementById('modal-feat-bass');
    const mc = document.getElementById('modal-feat-crystal');
    const mr = document.getElementById('modal-feat-reverb');
    if (mb) mb.classList.toggle('active', bassOn);
    if (mc) mc.classList.toggle('active', crystalOn);
    if (mr) mr.classList.toggle('active', reverbOn);
}

function startVisualizer() { if (!audioContext || visualizerRunning || !visualizerEnabled || !isPlaying) return; if (audioContext.state === 'suspended') audioContext.resume(); visualizerRunning = true; drawVisualizer(); }
function stopVisualizer() { visualizerRunning = false; if (visualizerCanvas) { const ctx = visualizerCanvas.getContext('2d'); ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); } }

function updateAnalyserSettings() {
    if (!analyser) return;
    analyser.smoothingTimeConstant = 0.6;
    const dbValue = -15 - (visSensitivity * 15);
    analyser.maxDecibels = dbValue;
}

function drawVisualizer() {
    if (!visualizerRunning || !isPlaying || !visualizerEnabled || !analyser || !visualizerDataArray || document.hidden) { 
        if (visualizerRunning && !document.hidden) {
            // Only stop if explicitly disabled or paused
            if (!visualizerEnabled || !isPlaying) visualizerRunning = false;
        }
        if (visualizerRunning) requestAnimationFrame(drawVisualizer); // Keep loop alive but idle if just hidden
        return; 
    }
    requestAnimationFrame(drawVisualizer);
    const ctx = visualizerCanvas.getContext('2d'); const { width, height } = visualizerCanvas; ctx.clearRect(0, 0, width, height);
    const ac = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#38bdf8';
    analyser.getByteFrequencyData(visualizerDataArray); const boost = 1 + (visSensitivity * 0.12);

    if (currentVisualizerStyle === 'bars') {
        const bl = analyser.frequencyBinCount, hb = bl / 2, bw = (width / hb) / 2; let x = 0;
        for (let i = 0; i < hb; i++) { const bh = (visualizerDataArray[i] / 255) * height * 0.95 * boost; ctx.fillStyle = ac; ctx.fillRect(width / 2 + x, height - bh, bw, bh); ctx.fillRect(width / 2 - x - bw, height - bh, bw, bh); x += bw + 1; }
    } else if (currentVisualizerStyle === 'circle') {
        const centerX = width / 2, centerY = height / 2, radius = Math.min(width, height) / 3;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); ctx.strokeStyle = `${ac}44`; ctx.lineWidth = 2; ctx.stroke();
        for (let i = 0; i < visualizerDataArray.length; i += 4) {
            const bh = (visualizerDataArray[i] / 255) * radius * 0.7 * boost, angle = (i / visualizerDataArray.length) * (Math.PI * 2);
            const x1 = centerX + Math.cos(angle) * radius, y1 = centerY + Math.sin(angle) * radius, x2 = centerX + Math.cos(angle) * (radius + bh), y2 = centerY + Math.sin(angle) * (radius + bh);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = ac; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
        }
    } else if (currentVisualizerStyle === 'prism') {
        const blv = (visualizerDataArray[0] + visualizerDataArray[4]) / 2, amplitude = (blv / 255) * (height / 2.1) * boost;
        ctx.strokeStyle = ac; ctx.lineWidth = 4; ctx.lineCap = 'round'; const time = Date.now() * 0.0015;
        for (let j = 0; j < 3; j++) {
            ctx.beginPath(); ctx.globalAlpha = 0.5 - (j * 0.15); const startY = height / 2; ctx.moveTo(0, startY);
            for (let i = 0; i <= width; i += 20) {
                const fadeArea = width * 0.2, edgeFade = Math.min(i / fadeArea, (width - i) / fadeArea, 1), x = i, y = startY + Math.sin((i * 0.005) + time + (j * 0.8)) * (amplitude + (j * 15)) * edgeFade;
                ctx.quadraticCurveTo(x - 10, y, x, y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    } else if (currentVisualizerStyle === 'dinopulse') {
        const blv = (visualizerDataArray[0] + visualizerDataArray[1] + visualizerDataArray[2]) / 3, bass = (blv / 255) * boost, centerX = width / 2;
        ctx.fillStyle = `${ac}22`; ctx.fillRect(0, height - 20, width, 2); const bars = 32, bw = width / bars;
        for(let i=0; i<bars; i++) { const h = (visualizerDataArray[i*4] / 255) * (height * 0.45) * boost; ctx.fillStyle = `${ac}33`; ctx.fillRect(i*bw, height - h, bw-2, h); }
        const speedTime = (Date.now() * 0.005) % 1; for(let i=0; i<5; i++) { const px = ((i * 0.2 + speedTime) % 1) * width; ctx.fillStyle = ac; ctx.globalAlpha = 0.3; ctx.fillRect(px, height - 15, 10, 2); }
        const obstacleTime = (Date.now() * 0.0004) % 1, ox = width - (obstacleTime * (width + 100)), oy = height - 45;
        ctx.globalAlpha = 1.0; ctx.fillStyle = ac;
        ctx.fillRect(ox, oy, 6, 25); ctx.fillRect(ox - 6, oy + 8, 6, 4); ctx.fillRect(ox - 6, oy + 4, 3, 4);
        ctx.fillRect(ox + 6, oy + 5, 6, 4); ctx.fillRect(ox + 9, oy + 1, 3, 4);
        const dx = centerX - 40, dy = height - 55 - Math.max(0, (bass > 0.5 ? (bass - 0.5) * 250 : 0));
        ctx.fillStyle = ac; ctx.fillRect(dx, dy, 25, 15); ctx.fillRect(dx + 18, dy - 12, 15, 12); ctx.fillRect(dx - 8, dy, 8, 8); ctx.fillStyle = 'black'; ctx.fillRect(dx + 28, dy - 9, 3, 3);
        if (settings.theme === 'xmas') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(dx + 18, dy - 12); ctx.lineTo(dx + 25, dy - 22); ctx.lineTo(dx + 33, dy - 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(dx + 25, dy - 22, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = ac; const isJumping = (height - 55 - dy) > 5, legPhase = isJumping ? 0 : (Date.now() * 0.015) % (Math.PI * 2);
        ctx.fillRect(dx + 5, dy + 15, 4, 8 + Math.sin(legPhase) * 6); ctx.fillRect(dx + 15, dy + 15, 4, 8 + Math.cos(legPhase) * 6); ctx.fillRect(dx + 30, dy - 5, 6, 5);
    } else if (currentVisualizerStyle === 'retro') {
        const totalBars = 60, halfBars = totalBars / 2, bw = width / totalBars, blocks = 10, bh = height / blocks, binCount = analyser.frequencyBinCount, center = width / 2;
        for (let i = 0; i < halfBars; i++) {
            const percent = i / halfBars;
            const startBin = Math.floor(Math.pow(percent, 1.5) * binCount * 0.8), endBin = Math.floor(Math.pow((i + 1) / halfBars, 1.5) * binCount * 0.8) + 1;
            let maxVal = 0; for (let b = startBin; b < endBin && b < binCount; b++) { if (visualizerDataArray[b] > maxVal) maxVal = visualizerDataArray[b]; }
            const val = Math.floor((maxVal / 255) * blocks * boost * (1 + percent * 1.5));
            for (let j = 0; j < Math.min(val, blocks); j++) {
                if (j > blocks * 0.8) ctx.fillStyle = '#ef4444'; else if (j > blocks * 0.6) ctx.fillStyle = '#fbbf24'; else ctx.fillStyle = ac;
                ctx.fillRect(center + i * bw + 2, height - (j * bh) - bh + 2, bw - 4, bh - 4);
                ctx.fillRect(center - (i + 1) * bw + 2, height - (j * bh) - bh + 2, bw - 4, bh - 4);
            }
        }
    }
    if (musicEmojiEl && !isNaN(audio.currentTime)) {
        const blv = (visualizerDataArray[0] + visualizerDataArray[1]) / 2, fy = Math.sin(audio.currentTime * 2) * 10;
        let js = (blv > 180) ? 1 + (Math.min((blv - 180) / 50, 1) * 0.15) : 1; musicEmojiEl.style.transform = `translateY(${fy}px) scale(${js})`;
    }
}

function setupAudioEvents() {
    audio.addEventListener('timeupdate', () => { if (!isNaN(audio.duration)) { const p = (audio.currentTime / audio.duration) * 100; if (progressFill) progressFill.style.width = `${p}%`; if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime); }});
    audio.addEventListener('durationchange', () => { if (durationEl) durationEl.textContent = isNaN(audio.duration) ? '0:00' : formatTime(audio.duration); });
    audio.addEventListener('play', () => { 
        isPlaying = true; 
        document.body.classList.add('is-playing');
        updatePlayPauseUI(); 
        updateUIForCurrentTrack(); 
        startVisualizer(); 
        if (window.api.sendPlaybackState) window.api.sendPlaybackState(true); 
    });
    audio.addEventListener('pause', () => { 
        isPlaying = false; 
        document.body.classList.remove('is-playing');
        updatePlayPauseUI(); 
        stopVisualizer(); 
        if (window.api.sendPlaybackState) window.api.sendPlaybackState(false); 
    });
    audio.addEventListener('ended', () => { stopVisualizer(); if (loopMode === 'one') { audio.currentTime = 0; audio.play(); } else playNext(); });
    audio.addEventListener('error', (e) => { console.error("Audio playback error:", e); showNotification(tr('statusError')); isPlaying = false; updatePlayPauseUI(); });
    audio.addEventListener('volumechange', () => { currentVolume = audio.volume; if (volumeSlider) volumeSlider.value = currentVolume; if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume); clearTimeout(window.volumeSaveTimeout); window.volumeSaveTimeout = setTimeout(() => { window.api.setSetting('volume', currentVolume); }, 500); });
}

async function loadSettings() {
    const s = await window.api.getSettings(); if (s) settings = s;
    currentVolume = settings.volume !== undefined ? settings.volume : 0.2; audio.volume = currentVolume; shuffleOn = settings.shuffle || false; loopMode = settings.loop || 'off'; currentLanguage = settings.language || 'de'; sortMode = settings.sortMode || 'name';
    if (downloadFolderInput) downloadFolderInput.value = settings.downloadFolder || '';
    if (qualitySelect) qualitySelect.value = settings.audioQuality || 'best';
    if (animationSelect) { let mode = settings.animationMode || 'flow'; animationSelect.value = mode; applyAnimationSetting(mode); }
    if (themeSelect) themeSelect.value = settings.theme || 'blue';
    if (visualizerToggle) { visualizerToggle.checked = settings.visualizerEnabled !== false; visualizerEnabled = settings.visualizerEnabled !== false; }
    if (visualizerStyleSelect) { currentVisualizerStyle = settings.visualizerStyle || 'bars'; visualizerStyleSelect.value = currentVisualizerStyle; }
    if (visualizerSensitivity) { visSensitivity = settings.visSensitivity || 1.5; visualizerSensitivity.value = visSensitivity; }
    if (toggleDeleteSongs) { toggleDeleteSongs.checked = settings.deleteSongsEnabled || false; deleteSongsEnabled = settings.deleteSongsEnabled || false; }
    if (autoLoadLastFolderToggle) autoLoadLastFolderToggle.checked = settings.autoLoadLastFolder !== false;
    if (toggleEnableFocus) {
        settings.enableFocusMode = false;
        toggleEnableFocus.checked = false;
        if (toggleFocusModeBtn) toggleFocusModeBtn.style.display = 'none';
        document.body.classList.remove('focus-active');
    }
    if (toggleEnableDrag) toggleEnableDrag.checked = settings.enableDragAndDrop !== false;
    if (toggleUseCustomColor) { toggleUseCustomColor.checked = settings.useCustomColor || false; if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !toggleUseCustomColor.checked); }
    const et = settings.coverEmoji || 'note', ce = settings.customCoverEmoji || '🎵';
    if (emojiSelect) emojiSelect.value = et; if (customEmojiInput) customEmojiInput.value = ce;
    if (customEmojiContainer) customEmojiContainer.style.display = et === 'custom' ? 'flex' : 'none';
    updateEmoji(et, ce);
    
    // Load Bass Boost
    if (bassBoostToggle) {
        bassBoostToggle.checked = settings.bassBoostEnabled || false;
        if (bassBoostContainer) bassBoostContainer.style.display = settings.bassBoostEnabled ? 'flex' : 'none';
    }
    if (bassBoostSlider) {
        const boostVal = settings.bassBoostValue !== undefined ? settings.bassBoostValue : 6;
        bassBoostSlider.value = boostVal;
        if (bassBoostValueEl) bassBoostValueEl.textContent = boostVal + 'dB';
    }
    
    // Load Treble Boost
    if (trebleBoostToggle) {
        trebleBoostToggle.checked = settings.trebleBoostEnabled || false;
        if (trebleBoostContainer) trebleBoostContainer.style.display = settings.trebleBoostEnabled ? 'flex' : 'none';
    }
    if (trebleBoostSlider) {
        const tVal = settings.trebleBoostValue !== undefined ? settings.trebleBoostValue : 6;
        trebleBoostSlider.value = tVal;
        if (trebleBoostValueEl) trebleBoostValueEl.textContent = tVal + 'dB';
    }

    // Load Reverb
    if (reverbToggle) {
        reverbToggle.checked = settings.reverbEnabled || false;
        if (reverbContainer) reverbContainer.style.display = settings.reverbEnabled ? 'flex' : 'none';
    }
    if (reverbSlider) {
        const rVal = settings.reverbValue !== undefined ? settings.reverbValue : 30;
        reverbSlider.value = rVal;
        if (reverbValueEl) reverbValueEl.textContent = rVal + '%';
    }
    
    // Load Cinema Mode
    if (toggleCinemaMode) {
        toggleCinemaMode.checked = settings.cinemaMode || false;
        document.body.classList.toggle('cinema-mode', settings.cinemaMode || false);
    }

    updateAudioEffects();

    if (speedSlider) { const sp = settings.playbackSpeed || 1.0; speedSlider.value = sp; audio.playbackRate = sp; if(speedValue) speedValue.textContent = sp.toFixed(1) + 'x'; }
    if (settings.currentFolderPath && (settings.autoLoadLastFolder !== false)) { currentFolderPath = settings.currentFolderPath; try { const result = await window.api.refreshMusicFolder(currentFolderPath); if (result && result.tracks) { basePlaylist = result.tracks; sortPlaylist(sortMode); updateUIForCurrentTrack(); } } catch (e) { console.error(e); } }
    if (shuffleBtn) shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    if (loopBtn) { loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); }
    if (langButtons) langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === currentLanguage));
}

function updateLoopIcon() {
    if (!loopBtn) return;
    if (loopMode === 'one') loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="17" font-size="10" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>`;
    else loopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
}

function applyAnimationSetting(mode) { 
    if (!backgroundAnimationEl) return; 
    backgroundAnimationEl.className = 'background-animation'; 
    backgroundAnimationEl.innerHTML = '';
    if (snowInterval) clearInterval(snowInterval);
    
    if (mode && mode !== 'off') { 
        backgroundAnimationEl.style.display = 'block'; 
        backgroundAnimationEl.classList.add(`type-${mode}`); 
        if (mode === 'xmas') startSnowfall();
    } else { 
        backgroundAnimationEl.style.display = 'none'; 
    } 
}

function startSnowfall() {
    const createSnowflake = () => {
        if (!backgroundAnimationEl) return;
        const flake = document.createElement('span');
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = Math.random() * 5 + 5 + 's';
        flake.style.opacity = Math.random() * 0.7 + 0.3;
        flake.style.fontSize = (Math.random() * 10 + 12) + 'px';
        flake.innerHTML = '❄';
        flake.style.position = 'absolute';
        flake.style.top = '-20px';
        flake.style.color = 'white';
        flake.style.pointerEvents = 'none';
        flake.style.animationName = 'snowfall';
        flake.style.animationTimingFunction = 'linear';
        flake.style.animationIterationCount = 'infinite';
        flake.style.filter = 'blur(1px)';
        backgroundAnimationEl.appendChild(flake);
        setTimeout(() => { flake.remove(); }, 10000);
    };
    snowInterval = setInterval(createSnowflake, 400);
}
function formatTime(s) { if (isNaN(s)) return '0:00'; const m = Math.floor(s / 60), sc = Math.floor(s % 60).toString().padStart(2, '0'); return `${m}:${sc}`; }
function getVolumeIcon(v) {
    if (v === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    if (v < 0.5) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

function filterPlaylist(q) { playlist = !q ? [...basePlaylist] : basePlaylist.filter(t => t.title.toLowerCase().includes(q.toLowerCase()) || (t.artist && t.artist.toLowerCase().includes(q.toLowerCase()))); renderPlaylist(); }
function sortPlaylist(m) { const srt = [...basePlaylist]; if (m === 'name') srt.sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true })); else if (m === 'nameDesc') srt.sort((a, b) => b.title.localeCompare(a.title, 'de', { numeric: true })); else if (m === 'newest') srt.sort((a, b) => (b.mtime || 0) - (a.mtime || 0)); basePlaylist = srt; playlist = [...basePlaylist]; renderPlaylist(); }
function showContextMenu(e, idx) { contextTrackIndex = idx; if (!contextMenu) return; contextMenu.style.top = `${e.clientY}px`; contextMenu.style.left = `${e.clientX}px`; contextMenu.style.display = 'block'; const hcm = () => { contextMenu.style.display = 'none'; window.removeEventListener('click', hcm); }; window.addEventListener('click', hcm); }
function handleDeleteTrack(fp) { trackToDeletePath = fp; confirmDeleteOverlay.classList.add('visible'); let c = 5; confirmDeleteBtn.disabled = true; confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${c})`; const ci = setInterval(() => { c--; if (c > 0) confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${c})`; else { clearInterval(ci); confirmDeleteBtn.textContent = tr('confirmDeleteButton'); confirmDeleteBtn.disabled = false; } }, 1000); }

function setupEventListeners() {
    const bind = (el, ev, h) => { if (el && typeof el.addEventListener === 'function') el.addEventListener(ev, h); };
    bind(playBtn, 'click', () => { if (playlist.length === 0) return; if (isPlaying) audio.pause(); else (currentIndex === -1) ? playTrack(0) : audio.play(); });
    bind(nextBtn, 'click', playNext); bind(prevBtn, 'click', playPrev);
    bind(shuffleBtn, 'click', () => { shuffleOn = !shuffleOn; shuffleBtn.classList.toggle('mode-btn--active', shuffleOn); window.api.setSetting('shuffle', shuffleOn); });
    bind(loopBtn, 'click', () => { loopMode = (loopMode === 'off' ? 'all' : (loopMode === 'all' ? 'one' : 'off')); loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); window.api.setSetting('loop', loopMode); });
    bind(progressBar, 'click', (e) => { if (!isNaN(audio.duration)) { const r = progressBar.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; } });
    bind(volumeSlider, 'input', (e) => { audio.volume = parseFloat(e.target.value); });
    bind(openLibraryBtn, 'click', () => { libraryOverlay.classList.add('visible'); });
    bind(libraryCloseBtn, 'click', () => { libraryOverlay.classList.remove('visible'); });
    bind(loadFolderBtn, 'click', async () => { const r = await window.api.selectMusicFolder(); if (r && r.tracks) { basePlaylist = r.tracks; playlist = [...basePlaylist]; currentIndex = -1; renderPlaylist(); updateUIForCurrentTrack(); currentFolderPath = r.folderPath; window.api.setSetting('currentFolderPath', currentFolderPath); libraryOverlay.classList.remove('visible'); } });
    bind(refreshFolderBtn, 'click', async () => { let path = currentFolderPath || settings.currentFolderPath; if (!path) return; const r = await window.api.refreshMusicFolder(path); if (r && r.tracks) { currentFolderPath = r.folderPath; window.api.setSetting('currentFolderPath', currentFolderPath); basePlaylist = r.tracks; sortPlaylist(sortMode); updateUIForCurrentTrack(); settingsOverlay.classList.remove('visible'); } });
    let st; bind(searchInput, 'input', (e) => { clearTimeout(st); st = setTimeout(() => { filterPlaylist(e.target.value); }, 250); });
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.code) { case 'Space': e.preventDefault(); if (isPlaying) audio.pause(); else audio.play(); break; case 'ArrowRight': playNext(); break; case 'ArrowLeft': playPrev(); break; case 'ArrowUp': e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.05); break; case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); break; }
    });
    bind(toggleMiniMode, 'change', (e) => { if (e.target.checked) window.api.setWindowSize(340, 520); else window.api.setWindowSize(1300, 900); });
    bind(downloadBtn, 'click', handleDownload);
    window.api.onMediaControl((a) => { if (a === 'play-pause') { if (isPlaying) audio.pause(); else audio.play(); } else if (a === 'next') playNext(); else if (a === 'previous') playPrev(); });
    window.api.onDownloadProgress((d) => { 
        if (d && (typeof d.percent === 'number' || typeof d.percent === 'string') && downloadProgressFill) { 
            const p = parseFloat(d.percent);
            if (!isNaN(p)) {
                downloadProgressFill.style.width = `${p}%`; 
                downloadStatusEl.textContent = tr('statusProgress', p.toFixed(1)); 
            }
        } 
    });
    if (langButtons) langButtons.forEach(btn => { bind(btn, 'click', () => { currentLanguage = btn.dataset.lang; langButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active'); applyTranslations(); window.api.setSetting('language', currentLanguage); }); });
    bind(themeSelect, 'change', (e) => { const th = e.target.value; document.documentElement.setAttribute('data-theme', th); window.api.setSetting('theme', th); });
    bind(accentColorPicker, 'input', (e) => { const color = e.target.value; document.documentElement.style.setProperty('--accent', color); window.api.setSetting('customAccentColor', color); });
    window.addEventListener('dragover', (e) => { if (settings.enableDragAndDrop === false) return; e.preventDefault(); if (dropZone) dropZone.classList.add('active'); });
    window.addEventListener('dragleave', (e) => { if (settings.enableDragAndDrop === false) return; if (e.relatedTarget === null) { if (dropZone) dropZone.classList.remove('active'); } });
    window.addEventListener('drop', async (e) => {
        if (settings.enableDragAndDrop === false) return;
        e.preventDefault();
        if (dropZone) dropZone.classList.remove('active');
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        if (currentFolderPath) {
            let movedCount = 0;
            for (const file of files) {
                const res = await window.api.moveFile(file.path, currentFolderPath);
                if (res.success) movedCount++;
            }
            if (movedCount > 0) {
                const r = await window.api.refreshMusicFolder(currentFolderPath);
                if (r && r.tracks) {
                    basePlaylist = r.tracks;
                    sortPlaylist(sortMode);
                    showNotification(tr('tracksAdded', movedCount));
                }
            }
        } else {
            const firstPath = files[0].path;
            const r = await window.api.refreshMusicFolder(firstPath);
            if (r && r.tracks && r.tracks.length > 0) {
                basePlaylist = r.tracks; playlist = [...basePlaylist]; currentIndex = -1;
                renderPlaylist(); updateUIForCurrentTrack(); currentFolderPath = r.folderPath;
                window.api.setSetting('currentFolderPath', currentFolderPath);
                showNotification(tr('loadFolder'));
            }
        }
    });
    bind(sortSelect, 'change', (e) => { sortMode = e.target.value; window.api.setSetting('sortMode', sortMode); sortPlaylist(sortMode); });
    bind(settingsBtn, 'click', () => { settingsOverlay.classList.add('visible'); });
    bind(settingsCloseBtn, 'click', () => { settingsOverlay.classList.remove('visible'); });
    bind(changeFolderBtn, 'click', async () => { const nf = await window.api.selectFolder(); if (nf) { if (downloadFolderInput) downloadFolderInput.value = nf; window.api.setSetting('downloadFolder', nf); } });
    bind(qualitySelect, 'change', (e) => window.api.setSetting('audioQuality', e.target.value));
    bind(visualizerToggle, 'change', (e) => { visualizerEnabled = e.target.checked; window.api.setSetting('visualizerEnabled', visualizerEnabled); if (visualizerEnabled) startVisualizer(); else stopVisualizer(); });
    bind(visualizerStyleSelect, 'change', (e) => { currentVisualizerStyle = e.target.value; window.api.setSetting('visualizerStyle', currentVisualizerStyle); });
    bind(visualizerSensitivity, 'input', (e) => { visSensitivity = parseFloat(e.target.value); updateAnalyserSettings(); window.api.setSetting('visSensitivity', visSensitivity); });
    bind($('#visualizer-sensitivity-reset-btn'), 'click', () => {
        const def = 1.5;
        if (visualizerSensitivity) visualizerSensitivity.value = def;
        visSensitivity = def;
        updateAnalyserSettings();
        window.api.setSetting('visSensitivity', def);
    });
    bind(sleepTimerSelect, 'change', (e) => { const mins = parseInt(e.target.value); if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; } if (mins > 0) { sleepTimerId = setTimeout(() => { audio.pause(); isPlaying = false; updatePlayPauseUI(); showNotification(tr('sleepTimerStopped')); sleepTimerSelect.value = "0"; sleepTimerId = null; }, mins * 60000); showNotification(tr('sleepTimerNotify', mins)); } });
    bind(animationSelect, 'change', (e) => { const m = e.target.value; window.api.setSetting('animationMode', m).catch(console.error); applyAnimationSetting(m); });
    bind(autoLoadLastFolderToggle, 'change', (e) => { window.api.setSetting('autoLoadLastFolder', e.target.checked); if (e.target.checked && currentFolderPath) window.api.setSetting('currentFolderPath', currentFolderPath); });
    bind(toggleEnableFocus, 'change', (e) => { window.api.setSetting('enableFocusMode', e.target.checked); if (toggleFocusModeBtn) toggleFocusModeBtn.style.display = e.target.checked ? 'flex' : 'none'; });
    bind(toggleFocusModeBtn, 'click', () => {
        document.body.classList.toggle('focus-active');
        if (document.body.classList.contains('focus-active')) {
            showNotification(tr('focusActiveNotify'));
        }
    });
    bind(toggleEnableDrag, 'change', (e) => { window.api.setSetting('enableDragAndDrop', e.target.checked); });
    bind(speedSlider, 'input', (e) => { 
        const v = parseFloat(e.target.value); 
        audio.defaultPlaybackRate = v;
        audio.playbackRate = v; 
        if(speedValue) speedValue.textContent = v.toFixed(1) + 'x'; 
        window.api.setSetting('playbackSpeed', v); 
    });
    bind($('#speed-reset-btn'), 'click', () => {
        const def = 1.0;
        if (speedSlider) speedSlider.value = def;
        audio.defaultPlaybackRate = def;
        audio.playbackRate = def;
        if (speedValue) speedValue.textContent = def.toFixed(1) + 'x';
        window.api.setSetting('playbackSpeed', def);
    });

    // Bass Boost Listeners
    bind(bassBoostToggle, 'change', (e) => {
        const enabled = e.target.checked;
        settings.bassBoostEnabled = enabled;
        window.api.setSetting('bassBoostEnabled', enabled);
        if (bassBoostContainer) bassBoostContainer.style.display = enabled ? 'flex' : 'none';
        updateAudioEffects();
    });
    bind(bassBoostSlider, 'input', (e) => {
        const val = parseFloat(e.target.value);
        settings.bassBoostValue = val;
        window.api.setSetting('bassBoostValue', val);
        if (bassBoostValueEl) bassBoostValueEl.textContent = val + 'dB';
        updateAudioEffects();
    });
    
    // Treble Boost Listeners
    bind(trebleBoostToggle, 'change', (e) => {
        const enabled = e.target.checked;
        settings.trebleBoostEnabled = enabled;
        window.api.setSetting('trebleBoostEnabled', enabled);
        if (trebleBoostContainer) trebleBoostContainer.style.display = enabled ? 'flex' : 'none';
        updateAudioEffects();
    });
    bind(trebleBoostSlider, 'input', (e) => {
        const val = parseFloat(e.target.value);
        settings.trebleBoostValue = val;
        window.api.setSetting('trebleBoostValue', val);
        if (trebleBoostValueEl) trebleBoostValueEl.textContent = val + 'dB';
        updateAudioEffects();
    });

    // Reverb Listeners
    bind(reverbToggle, 'change', (e) => {
        const enabled = e.target.checked;
        settings.reverbEnabled = enabled;
        window.api.setSetting('reverbEnabled', enabled);
        if (reverbContainer) reverbContainer.style.display = enabled ? 'flex' : 'none';
        updateAudioEffects();
    });
    bind($('#reverb-slider'), 'input', (e) => {
        const val = parseFloat(e.target.value);
        settings.reverbValue = val;
        window.api.setSetting('reverbValue', val);
        if (reverbValueEl) reverbValueEl.textContent = val + '%';
        updateAudioEffects();
    });

    // Reset Buttons for Audio Extras
    bind($('#bass-boost-reset-btn'), 'click', () => {
        const def = 6;
        settings.bassBoostValue = def;
        if (bassBoostSlider) bassBoostSlider.value = def;
        if (bassBoostValueEl) bassBoostValueEl.textContent = def + 'dB';
        window.api.setSetting('bassBoostValue', def);
        updateAudioEffects();
    });

    bind($('#treble-boost-reset-btn'), 'click', () => {
        const def = 6;
        settings.trebleBoostValue = def;
        if (trebleBoostSlider) trebleBoostSlider.value = def;
        if (trebleBoostValueEl) trebleBoostValueEl.textContent = def + 'dB';
        window.api.setSetting('trebleBoostValue', def);
        updateAudioEffects();
    });

    bind($('#reverb-reset-btn'), 'click', () => {
        const def = 30;
        settings.reverbValue = def;
        if (reverbSlider) reverbSlider.value = def;
        if (reverbValueEl) reverbValueEl.textContent = def + '%';
        window.api.setSetting('reverbValue', def);
        updateAudioEffects();
    });

    // Cinema Mode
    bind(toggleCinemaMode, 'change', (e) => {
        const enabled = e.target.checked;
        settings.cinemaMode = enabled;
        window.api.setSetting('cinemaMode', enabled);
        document.body.classList.toggle('cinema-mode', enabled);
    });

    // Export Playlist
    bind(btnExportPlaylist, 'click', () => {
        if (!playlist || playlist.length === 0) { showNotification(tr('emptyPlaylist')); return; }
        const content = playlist.map((t, i) => `${i+1}. ${t.artist || 'Unknown'} - ${t.title}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'playlist_export.txt';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Playlist exportiert!');
    });
    bind(toggleUseCustomColor, 'change', (e) => {
        window.api.setSetting('useCustomColor', e.target.checked);
        if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !e.target.checked);
        if (e.target.checked) { const color = accentColorPicker ? accentColorPicker.value : '#38bdf8'; document.documentElement.style.setProperty('--accent', color); }
        else { document.documentElement.style.removeProperty('--accent'); }
    });
        bind(emojiSelect, 'change', (e) => {
            const v = e.target.value;
            if (customEmojiContainer) customEmojiContainer.style.display = v === 'custom' ? 'flex' : 'none';
            settings.coverEmoji = v;
            window.api.setSetting('coverEmoji', v);
            updateEmoji(v, customEmojiInput ? customEmojiInput.value : '');
        });
        
        bind(customEmojiInput, 'input', (e) => {
            const v = e.target.value;
            settings.customCoverEmoji = v;
            window.api.setSetting('customCoverEmoji', v);
            updateEmoji('custom', v);
        });
    bind(toggleDeleteSongs, 'change', (e) => { deleteSongsEnabled = e.target.checked; window.api.setSetting('deleteSongsEnabled', deleteSongsEnabled); renderPlaylist(); });
    bind(playlistEl, 'click', (e) => { const db = e.target.closest('.delete-track-btn'); if (db) { e.stopPropagation(); handleDeleteTrack(db.dataset.path); return; } const row = e.target.closest('.track-row'); if (row) playTrack(parseInt(row.dataset.index, 10)); });
    bind(playlistEl, 'contextmenu', (e) => { const r = e.target.closest('.track-row'); if (r) { e.preventDefault(); showContextMenu(e, parseInt(r.dataset.index, 10)); } });
    bind($('#context-menu-show-folder'), 'click', () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; window.api.showInFolder(playlist[contextTrackIndex].path); });
    bind(toggleDownloaderBtn, 'click', () => { downloaderOverlay.classList.add('visible'); });
    bind(downloaderCloseBtn, 'click', () => { downloaderOverlay.classList.remove('visible'); });
    bind(contextMenuEditTitle, 'click', () => { if (contextTrackIndex === null) return; const t = playlist[contextTrackIndex]; if (originalTitlePreview) originalTitlePreview.textContent = t.title; if (newTitlePreview) newTitlePreview.textContent = t.title; if (editTitleInput) editTitleInput.value = t.title; editTitleOverlay.classList.add('visible'); });
    bind(editTitleCancelBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleCloseBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleSaveBtn, 'click', async () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; const t = playlist[contextTrackIndex]; const nt = editTitleInput.value.trim(); if (!nt) return; const r = await window.api.updateTitle(t.path, nt); if (r.success) { t.title = nt; const bt = basePlaylist.find(x => x.path === t.path); if (bt) bt.title = nt; renderPlaylist(); updateUIForCurrentTrack(); editTitleOverlay.classList.remove('visible'); showNotification(tr('titleUpdated')); } });
    bind(confirmDeleteCancelBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteCloseBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteBtn, 'click', async () => { if (!trackToDeletePath) return; const ctp = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null; const r = await window.api.deleteTrack(trackToDeletePath); if (r.success) { basePlaylist = basePlaylist.filter(x => x.path !== trackToDeletePath); playlist = playlist.filter(x => x.path !== trackToDeletePath); if (ctp) { if (trackToDeletePath === ctp) { audio.pause(); currentIndex = -1; audio.src = ''; updatePlayPauseUI(); } else { currentIndex = playlist.findIndex(x => x.path === ctp); } } renderPlaylist(); updateUIForCurrentTrack(); confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; showNotification(tr('songDeleted')); } });
    let resTimeout; new ResizeObserver(() => { if (visualizerCanvas && visualizerContainer) { visualizerCanvas.width = visualizerContainer.clientWidth; visualizerCanvas.height = visualizerContainer.clientHeight; } }).observe(visualizerContainer);
    window.addEventListener('resize', () => { clearTimeout(resTimeout); resTimeout = setTimeout(updateTrackTitleScroll, 100); });
}

function showNotification(msg) {
    if (!notificationBar || !notificationMessage) return; if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationMessage.textContent = msg; notificationBar.classList.remove('visible'); void notificationBar.offsetWidth; notificationBar.classList.add('visible');
    notificationTimeout = setTimeout(() => { notificationBar.classList.remove('visible'); }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    $ = (s) => document.querySelector(s);
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
    visualizerStyleSelect = $('#visualizer-style-select'); visualizerSensitivity = $('#visualizer-sensitivity');
    sleepTimerSelect = $('#sleep-timer-select'); animationSelect = $('#animation-select'); backgroundAnimationEl = $('.background-animation'); emojiSelect = $('#emoji-select');
    customEmojiContainer = $('#custom-emoji-container'); customEmojiInput = $('#custom-emoji-input'); toggleDeleteSongs = $('#toggle-delete-songs');
    toggleDownloaderBtn = $('#toggle-downloader-btn'); contextMenu = $('#context-menu'); contextMenuEditTitle = $('#context-menu-edit-title');
    editTitleOverlay = $('#edit-title-overlay'); editTitleInput = $('#edit-title-input'); originalTitlePreview = $('#original-title-preview');
    newTitlePreview = $('#new-title-preview'); editTitleCancelBtn = $('#edit-title-cancel-btn'); editTitleSaveBtn = $('#edit-title-save-btn');
    editTitleCloseBtn = $('#edit-title-close-btn');
    confirmDeleteOverlay = $('#confirm-delete-overlay'); confirmDeleteBtn = $('#confirm-delete-btn'); confirmDeleteCancelBtn = $('#confirm-delete-cancel-btn');
    confirmDeleteCloseBtn = $('#confirm-delete-close-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder'); toggleMiniMode = $('#toggle-mini-mode');
    notificationBar = $('#notification-bar'); notificationMessage = $('#notification-message');
    accentColorPicker = $('#accent-color-picker');
    dropZone = $('#drop-zone'); toggleEnableDrag = $('#toggle-enable-drag'); toggleUseCustomColor = $('#toggle-use-custom-color');
    accentColorContainer = $('#accent-color-container');
    toggleEnableFocus = $('#toggle-enable-focus'); toggleFocusModeBtn = $('#toggle-focus-mode-btn');
    speedSlider = $('#speed-slider'); speedValue = $('#speed-value');
    
    bassBoostToggle = $('#toggle-bass-boost');
    bassBoostSlider = $('#bass-boost-slider');
    bassBoostValueEl = $('#bass-boost-value');
    bassBoostContainer = $('#bass-boost-slider-container');
    
    trebleBoostToggle = $('#toggle-treble-boost');
    trebleBoostSlider = $('#treble-boost-slider');
    trebleBoostValueEl = $('#treble-boost-value');
    trebleBoostContainer = $('#treble-boost-slider-container');
    
    reverbToggle = $('#toggle-reverb');
    reverbSlider = $('#reverb-slider');
    reverbValueEl = $('#reverb-value');
    reverbContainer = $('#reverb-slider-container');
    
    toggleCinemaMode = $('#toggle-cinema-mode');
    btnExportPlaylist = $('#btn-export-playlist');

    // Feature Icons
    const speakerLeft = $('#speaker-left');
    const speakerRight = $('#speaker-right');
    const reverbIcon = $('#reverb-active-icon');

    // Reset Buttons
    const bassResetBtn = $('#bass-boost-reset-btn');
    const trebleResetBtn = $('#treble-boost-reset-btn');
    const reverbResetBtn = $('#reverb-reset-btn');

    const overlays = [settingsOverlay, libraryOverlay, downloaderOverlay, editTitleOverlay, confirmDeleteOverlay];
    overlays.forEach(ov => { if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('visible'); }); });

    setupAudioEvents(); setupEventListeners(); setupVisualizer();

    const hideSplash = () => {
        const splash = $('#splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                document.body.classList.add('ready');
            }, 1000);
        } else {
            document.body.classList.add('ready');
        }
    };

    loadSettings().then(() => {
        try {
            if (settings.theme) document.documentElement.setAttribute('data-theme', settings.theme);
            if (settings.useCustomColor && settings.customAccentColor) { 
                document.documentElement.style.setProperty('--accent', settings.customAccentColor); 
                if (accentColorPicker) accentColorPicker.value = settings.customAccentColor; 
            }
            applyTranslations(); 
            audio.volume = currentVolume; 
            if (volumeSlider) volumeSlider.value = currentVolume; 
            if (volumeIcon) volumeIcon.innerHTML = getVolumeIcon(currentVolume);
        } catch (err) {
            console.error("Error applying settings:", err);
        }
        
        // Hide Splash Screen after Pulse
        setTimeout(hideSplash, 2500);
    }).catch(e => {
        console.error("Settings load failed:", e);
        hideSplash();
    });
});