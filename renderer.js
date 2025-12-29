// --- STATE & GLOBALS ---
let playlist = [];
let basePlaylist = [];
let currentIndex = -1;
let currentTrackPath = null;
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
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, openLibraryBtn, libraryOverlay, libraryCloseBtn, refreshFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloaderOverlay, downloaderCloseBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, visualizerStyleSelect, visualizerSensitivity, sleepTimerSelect, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDeleteSongs, toggleDownloaderBtn, contextMenu, contextMenuEditTitle, contextMenuFavorite, editTitleOverlay, editTitleInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, editTitleCloseBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, confirmDeleteCloseBtn, autoLoadLastFolderToggle, toggleMiniMode, notificationBar, notificationMessage, notificationTimeout, accentColorPicker, toggleFocusModeBtn, dropZone, toggleEnableFocus, toggleEnableDrag, toggleUseCustomColor, accentColorContainer, speedSlider, speedValue, snowInterval, toggleFavoritesBtn, toggleFavoritesOption, mainFavoriteBtn;
let favorites = [];
let favoritesSet = new Set();
let showingFavoritesOnly = false;

let trackToDeletePath = null;
let bassBoostToggle, bassBoostSlider, bassBoostValueEl, bassBoostContainer;
let trebleBoostToggle, trebleBoostSlider, trebleBoostValueEl, trebleBoostContainer;
let reverbToggle, reverbSlider, reverbValueEl, reverbContainer;
let toggleCinemaMode, btnExportPlaylist;
let renderPlaylistRequestId = null;

// Performance Monitoring State
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let avgFps = 60;
let perfHintShown = false;
let performanceMode = false;
let showStatsOverlay = false;
let targetFps = 60;
let lastRenderTime = 0;
let lastStatsTime = performance.now();
let cachedAccentColor = '#38bdf8';
let isStatsLoopRunning = false;

function updateCachedColor() {
    cachedAccentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38bdf8';
}

function updatePerformanceStats() {
    if (document.hidden) {
        requestAnimationFrame(updatePerformanceStats);
        return;
    }
    if (!isStatsLoopRunning) isStatsLoopRunning = true;
    const now = performance.now();
    const interval = 1000 / targetFps;
    const delta = now - lastStatsTime;

    if (delta < interval) {
        requestAnimationFrame(updatePerformanceStats);
        return;
    }

    lastStatsTime = now - (delta % interval);
    const timeSinceLastLog = now - lastFrameTime;
    frameCount++;

    if (timeSinceLastLog >= 1000) {
        fps = Math.round((frameCount * 1000) / timeSinceLastLog);
        avgFps = (avgFps * 0.8) + (fps * 0.2); 
        const currentFrameTime = Math.round(timeSinceLastLog / frameCount);
        frameCount = 0;
        lastFrameTime = now;

        if (showStatsOverlay || avgFps < targetFps * 0.8) {
            const fpsEl = document.getElementById('stat-fps');
            const timeEl = document.getElementById('stat-time');
            const lagEl = document.getElementById('stat-lag');
            const perfInfoEl = document.getElementById('stat-perf-info');

            if (fpsEl) {
                fpsEl.textContent = fps;
                if (fps >= targetFps * 0.9) fpsEl.style.color = '#4ade80';
                else if (fps >= targetFps * 0.6) fpsEl.style.color = '#fbbf24';
                else fpsEl.style.color = '#ef4444';
            }

            if (timeEl) {
                timeEl.textContent = currentFrameTime + 'ms';
            }
            
            if (lagEl) {
                if (avgFps < targetFps * 0.5) {
                    lagEl.textContent = 'LAG';
                    lagEl.style.color = '#ef4444';
                    triggerPerformanceHint();
                } else if (avgFps < targetFps * 0.8) {
                    lagEl.textContent = tr('statUnstable');
                    lagEl.style.color = '#fbbf24';
                } else {
                    lagEl.textContent = tr('statStable');
                    lagEl.style.color = '#4ade80';
                }
            }

            if (perfInfoEl) {
                if (performanceMode) {
                    perfInfoEl.textContent = tr('statPowerSave');
                } else {
                    const stability = Math.min(100, Math.round((avgFps / targetFps) * 100));
                    perfInfoEl.textContent = `${stability}% ${tr('statStability')}`;
                }
            }
        }
    }
    requestAnimationFrame(updatePerformanceStats);
}

// Hotkey Tracking
const pressedKeys = new Set();

function triggerPerformanceHint(force = false) {
    if (!force && (perfHintShown || performanceMode)) return;
    const hint = document.getElementById('performance-hint');
    const hintText = document.getElementById('hint-text');
    if (hint) {
        if (hintText) hintText.textContent = tr('perfLagMsg');
        hint.classList.add('visible');
        if (!force) perfHintShown = true;
        
        // Auto-hide after 10s
        setTimeout(() => { if (hint) hint.classList.remove('visible'); }, 10000);
    }
}

function setPerformanceMode(enabled) {
    performanceMode = enabled;
    settings.performanceMode = enabled;
    window.api.setSetting('performanceMode', enabled);
    
    const toggle = document.getElementById('toggle-performance-mode');
    if (toggle) toggle.checked = enabled;

    if (enabled) {
        stopVisualizer();
        applyAnimationSetting('off');
        document.body.classList.add('perf-mode-active');
        showNotification(tr('perfModeOn'));
    } else {
        if (isPlaying) startVisualizer();
        applyAnimationSetting(settings.animationMode || 'flow');
        document.body.classList.remove('perf-mode-active');
    }
}

// --- TRANSLATIONS ---
const translations = {
    de: {
        appTitle: 'NovaWave - Musik Player', appSubtitle: 'Lokal & YouTube',
        nothingPlaying: 'Nichts spielt', unknownArtist: 'Unbekannter Künstler',
        loadFolder: 'Ordner laden', refreshFolder: 'Aktualisieren', searchPlaceholder: 'Playlist durchsuchen...', emptyPlaylist: 'Playlist ist leer. Lade einen Ordner!',
        noFavoritesFound: 'Keine Favoriten in diesem Ordner gefunden.',
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
        themeBlue: 'Standard Blau', themeDark: 'Mitternachts-Lila', themePurple: 'Blurple', themeRose: 'Tiefrot', themeDino: 'Dino Grün', themeXmas: 'Weihnachten',
        shuffle: 'Zufallswiedergabe', previous: 'Zurück', playPause: 'Abspielen/Pause',
        next: 'Weiter', loop: 'Wiederholen', settings: 'Einstellungen', close: 'Schließen',
        toggleDownloader: 'YouTube Downloader', deleteSong: 'Song löschen',
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
        emojiLovingDinos: 'Verliebte Dinos',
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
        animOff: 'Aus', animFlow: 'Flow', animNebula: 'Nebula', animStellar: 'Stellar', animAurora: 'Aurora', animXmas: 'Schneefall',
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
        activeFeatures: 'Aktive Effekte',
        sectionAudioExtras: 'Audio-Extras', sectionExtras: 'Extras & Tools',
        cinemaMode: 'Kino-Modus', cinemaModeDesc: 'Dimmt die Benutzeroberfläche für mehr Fokus.',
        exportPlaylist: 'Playlist exportieren', exportPlaylistDesc: 'Speichere die aktuelle Liste als Textdatei.',
        exportSuccess: 'Playlist erfolgreich exportiert!',
        enableFavoritesOption: 'Favoriten-Playlist', enableFavoritesOptionDesc: 'Zeige einen Button, um nur Favoriten anzuzeigen.',
        toggleFavorite: 'Favorit umschalten',
        addToFavorites: 'Zu Favoriten hinzufügen',
        removeFromFavorites: 'Von Favoriten entfernen',
        perfLagMsg: 'System-Lag erkannt. Performance-Mode aktivieren?',
        perfModeOn: 'Performance-Mode: Ein (Animationen & Vis aus)',
        perfModeLabel: 'Performance Mode',
        perfModeDesc: 'Deaktiviert Visualizer und Animationen für maximale CPU-Schonung.',
        showStatsLabel: 'System-Stats anzeigen',
        showStatsDesc: 'Zeigt FPS und Performance-Daten im Hauptfenster an.',
        fpsLimitLabel: 'FPS Limit',
        fpsLimitDesc: 'Begrenze die Bildrate für Visualizer und Animationen (15 - 120).',
        statStatus: 'Status', statStable: 'Stabil', statUnstable: 'Instabil', statFrame: 'Frame',
        statStability: 'Stabilität', statPowerSave: 'Energiesparen',
        helpTitle: 'Hilfe & Bedienung',
        helpPlayback: 'Wiedergabe',
        helpFeatures: 'Funktionen',
        helpPlayDesc: 'Starte deine Musik ganz einfach mit dem Play-Button oder der Leertaste.',
        helpNextDesc: 'Wechsle Songs mit den Pfeiltasten (Links/Rechts) oder klicke in die Playlist.',
        helpSkipDesc: 'Halte die Umschalt-Taste (Shift) gedrückt und nutze die Pfeiltasten zum Spulen.',
        helpDragDesc: 'Möchtest du neue Lieder hören? Ziehe sie einfach per Drag & Drop in den Player.',
        helpMiniDesc: 'Für mehr Platz auf dem Desktop: Der MINI-Modus bietet dir das Wesentliche.',
        helpFavDesc: 'Deine Lieblingssongs findest du schneller, wenn du sie mit dem Stern markierst.',
        helpOpenSettings: 'Öffne die Einstellungen hier für mehr Details',
        snuggleTimeDesc: 'Aktiviere das exklusive SnuggleDino Erlebnis mit festen Effekten.',
        newBadge: 'NEU',
        devTitle: 'Entwickler & Hotkey-Info',
        devStandardHotkeys: 'Standard Hotkeys',
        devDebugHotkeys: 'Debug & Entwickler (v2.5.0)',
        devPlayPause: 'Abspielen / Pause',
        devNextSong: 'Nächster Song',
        devPrevSong: 'Vorheriger Song',
        devVol: 'Lautstärke +/-',
        devSkip: '5 Sek. vor/zurück',
        devOpenMenu: 'Dieses Menü öffnen',
        devPerfHint: 'Performance-Hinweis (Island)',
        devWinSize: 'Fenstergröße Debug (Size)',
        devFooter: 'NovaWave Entwicklerkonsole v2.5.0',
    },
    en: {
        appTitle: 'NovaWave - Music Player', appSubtitle: 'Local & YouTube',
        nothingPlaying: 'Nothing Playing', unknownArtist: 'Unknown Artist',
        loadFolder: 'Load Folder', refreshFolder: 'Refresh', searchPlaceholder: 'Search playlist...', emptyPlaylist: 'Playlist is empty!',
        noFavoritesFound: 'No favorites found in this folder.',
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
        themeBlue: 'Standard Blue', themeDark: 'Midnight Purple', themePurple: 'Blurple', themeRose: 'Deep Rose', themeDino: 'Dino Green', themeXmas: 'Christmas',
        shuffle: 'Shuffle', previous: 'Previous', playPause: 'Play/Pause',
        next: 'Next', loop: 'Loop', settings: 'Settings', close: 'Close',
        toggleDownloader: 'YouTube Downloader', deleteSong: 'Delete Song',
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
        activeFeatures: 'Active Effects',
        sectionAudioExtras: 'Audio Extras', sectionExtras: 'Extras & Tools',
        cinemaMode: 'Cinema Mode', cinemaModeDesc: 'Dims the UI for better focus.',
        enableFavoritesOption: 'Favorites Playlist', enableFavoritesOptionDesc: 'Show a button to filter the playlist for favorites.',
        toggleFavorite: 'Toggle Favorite',
        addToFavorites: 'Add to Favorites',
        removeFromFavorites: 'Remove from Favorites',
        exportPlaylist: 'Export Playlist', exportPlaylistDesc: 'Save current list as a text file.',
        exportSuccess: 'Playlist exported successfully!',
        perfLagMsg: 'System lag detected. Enable Performance Mode?',
        perfModeOn: 'Performance Mode: On (Animations & Vis off)',
        perfModeLabel: 'Performance Mode',
        perfModeDesc: 'Disables visualizer and animations for maximum CPU saving.',
        showStatsLabel: 'Show System Stats',
        showStatsDesc: 'Displays FPS and performance data in the main window.',
        fpsLimitLabel: 'FPS Limit',
        fpsLimitDesc: 'Limit the frame rate for visualizer and animations (15 - 120).',
        statStatus: 'Status', statStable: 'Stable', statUnstable: 'Unstable', statFrame: 'Frame',
        statStability: 'Stability', statPowerSave: 'Power Save',
        helpTitle: 'Help & Controls',
        helpPlayback: 'Playback',
        helpFeatures: 'Features',
        helpPlayDesc: 'Start your music journey by clicking Play or pressing the Space bar.',
        helpNextDesc: 'Switch tracks using the Arrow keys (Left/Right) or pick from the playlist.',
        helpSkipDesc: 'Hold the Shift key and use Arrows to seek 5 seconds forward or backward.',
        helpDragDesc: 'Want new tracks? Just drag and drop music files or folders into the window.',
        helpMiniDesc: 'Need more space? The MINI mode gives you a compact player experience.',
        helpFavDesc: 'Keep your favorites close! Use the star icon to highlight songs you love.',
        helpOpenSettings: 'Open the settings here for more details',
        snuggleTimeDesc: 'Activate the exclusive SnuggleDino experience with fixed effects.',
        newBadge: 'NEW',
        devTitle: 'Developer & Hotkey Info',
        devStandardHotkeys: 'Standard Hotkeys',
        devDebugHotkeys: 'Debug & Dev (v2.5.0)',
        devPlayPause: 'Play / Pause',
        devNextSong: 'Next Track',
        devPrevSong: 'Previous Track',
        devVol: 'Volume +/-',
        devSkip: 'Skip 5s fwd/back',
        devOpenMenu: 'Open this menu',
        devPerfHint: 'Performance Hint (Island)',
        devWinSize: 'Window Size Debug (Size)',
        devFooter: 'NovaWave Dev Console v2.5.0',
        useCustomColorOption: 'Use Custom Accent Color',
        useCustomColorOptionDesc: 'Apply your selected color or use theme defaults.',
        coverEmoji: 'Cover Emoji',
        coverEmojiDescription: 'Choose an emoji for the album cover in the center.',
        emojiNote: 'Music Note',
        emojiDino: 'Dino',
        emojiLovingDinos: 'Loving Dinos',
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
        animOff: 'Off', animFlow: 'Flow', animNebula: 'Nebula', animStellar: 'Stellar', animAurora: 'Aurora', animXmas: 'Snowfall',
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

// --- CORE PLAYER LOGIC ---
function playTrack(index) {
    if (index < 0 || index >= playlist.length) { isPlaying = false; updatePlayPauseUI(); return; }
    currentIndex = index;
    const track = playlist[index];
    currentTrackPath = track.path;
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

// --- UI & DOM MANIPULATION ---
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
    
    if (mainFavoriteBtn) {
        const isFav = favoritesSet.has(track.path);
        mainFavoriteBtn.style.display = 'flex';
        mainFavoriteBtn.style.color = isFav ? '#fbbf24' : 'var(--text-muted)';
        const svg = mainFavoriteBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    }

    if (settings.snuggleTimeEnabled) {
        updateEmoji('loving_dinos');
    } else {
        updateEmoji(settings.coverEmoji || 'note', settings.customCoverEmoji);
    }
    updateActiveTrackInPlaylist();
    updateTrackTitleScroll();
    if (isPlaying && lastNotifiedPath !== track.path) { showNotification(`${tr('nowPlaying')}: ${track.title}`); lastNotifiedPath = track.path; }
}

function updatePlayPauseUI() { if (playIcon && pauseIcon) { playIcon.style.display = isPlaying ? 'none' : 'block'; pauseIcon.style.display = isPlaying ? 'block' : 'none'; } updateActiveTrackInPlaylist(); }

function updateActiveTrackInPlaylist() {
    if (!playlistEl) return;
    const previousActive = playlistEl.querySelector('.track-row.active');
    if (previousActive) { previousActive.classList.remove('active'); const indexEl = previousActive.querySelector('.track-index'); if (indexEl) indexEl.textContent = parseInt(previousActive.dataset.index, 10) + 1; }
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
    if (playlist.length === 0) { 
        const msg = showingFavoritesOnly ? tr('noFavoritesFound') : tr('emptyPlaylist');
        playlistEl.innerHTML = `<div class="empty-state">${msg}</div>`; 
        if (playlistInfoBar) playlistInfoBar.textContent = `0 ${tr('tracks')}`; 
        return; 
    }
    if (playlistInfoBar) playlistInfoBar.textContent = `${playlist.length} ${playlist.length === 1 ? tr('track') : tr('tracks')}`;
    let renderIndex = 0; const CHUNK_SIZE = 50;
    function renderChunk() {
        const fragment = document.createDocumentFragment(); const limit = Math.min(renderIndex + CHUNK_SIZE, playlist.length);
        for (let i = renderIndex; i < limit; i++) {
            const track = playlist[i], row = document.createElement('div');
            row.className = 'track-row'; row.dataset.index = i; if (i === currentIndex) row.classList.add('active');
            const pi = `<div class="playing-bars"><span></span><span></span><span></span></div>`;
            const isFav = favoritesSet.has(track.path);
            const favFill = isFav ? 'currentColor' : 'none';
            const favColor = isFav ? '#fbbf24' : 'var(--text-muted)';
            const favBtn = `<button class="fav-track-btn" data-path="${track.path}" title="${tr('toggleFavorite')}" style="color: ${favColor};"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${favFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>`;
            const db = deleteSongsEnabled ? `<button class="delete-track-btn" data-path="${track.path}" title="${tr('deleteSong')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></button>` : '';
            row.innerHTML = `<div class="track-index">${(isPlaying && i === currentIndex) ? pi : (i + 1)}</div><div class="track-info-block"><div class="track-title-small">${track.title}</div><div class="track-artist-small">${track.artist || tr('unknownArtist')}</div></div>${favBtn}<div class="track-duration">${formatTime(track.duration)}</div>${db}`;
            fragment.appendChild(row);
        }
        playlistEl.appendChild(fragment); renderIndex = limit;
        if (renderIndex < playlist.length) renderPlaylistRequestId = requestAnimationFrame(renderChunk);
    }
    renderChunk();
}

function applyTranslations() {
    document.querySelectorAll('[data-lang-key]').forEach(el => { const text = tr(el.dataset.langKey); if (text) el.textContent = text; });
    
    // Animate the Snuggle New Badge
    const newBadgeEl = document.getElementById('snuggle-new-badge');
    if (newBadgeEl) {
        const text = tr('newBadge');
        newBadgeEl.innerHTML = text.split('').map(char => `<span>${char}</span>`).join('');
    }

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
        const favBtnWidth = (mainFavoriteBtn && mainFavoriteBtn.style.display !== 'none') ? mainFavoriteBtn.offsetWidth + 12 : 0;
        const containerWidth = container.offsetWidth - favBtnWidth, textWidth = trackTitleEl.scrollWidth, titleText = trackTitleEl.textContent || "", isMiniMode = window.innerWidth < 450;
        if (textWidth > containerWidth || (isMiniMode && titleText.length > 20)) {
            const scrollDist = (textWidth - containerWidth + 20) * -1;
            trackTitleEl.style.setProperty('--scroll-dist', `${scrollDist}px`); trackTitleEl.classList.add('animating');
        }
    }, 350);
}

function updateEmoji(emojiType, customEmoji) {
    if (!musicEmojiEl) return; 
    let emoji = '🎵';
    let isImage = false;

    if (emojiType === 'note') emoji = '🎵'; 
    else if (emojiType === 'dino') emoji = '🦖'; 
    else if (emojiType === 'loving_dinos') {
        emoji = './assets/Two_Loving_Cute_Dinos.png';
        isImage = true;
    }
    else if (emojiType === 'gift') emoji = '🎁';
    else if (emojiType === 'custom' && customEmoji) emoji = customEmoji.trim();
    
    if (isImage) {
        musicEmojiEl.innerHTML = `<img src="${emoji}" alt="Dino" draggable="false" ondragstart="return false;" style="background: transparent !important; border: none !important;">`;
    } else {
        musicEmojiEl.textContent = emoji;
    }
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
    if (!visualizerRunning || performanceMode || !isPlaying || !visualizerEnabled || !analyser) { 
        visualizerRunning = false;
        return; 
    }

    if (document.hidden) {
        requestAnimationFrame(drawVisualizer);
        return;
    }

    const now = performance.now();
    const interval = 1000 / targetFps;
    const delta = now - lastRenderTime;

    if (delta < interval) {
        requestAnimationFrame(drawVisualizer);
        return;
    }

    lastRenderTime = now - (delta % interval);
    requestAnimationFrame(drawVisualizer);
    
    const ctx = visualizerCanvas.getContext('2d'); 
    if (!ctx) return;
    const { width, height } = visualizerCanvas; 
    ctx.clearRect(0, 0, width, height);
    const ac = cachedAccentColor;
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

function applySnuggleTime(enabled) {
    document.body.classList.toggle('snuggle-time-active', enabled);
    const accentToggle = document.getElementById('toggle-use-custom-color');
    
    if (enabled) {
        document.documentElement.setAttribute('data-theme', 'dinolove');
        currentVisualizerStyle = 'retro';
        if (visualizerStyleSelect) visualizerStyleSelect.value = 'retro';
        applyAnimationSetting('xmas');
        if (animationSelect) animationSelect.value = 'xmas';
        updateEmoji('loving_dinos');
        if (emojiSelect) emojiSelect.value = 'loving_dinos';

        if (accentToggle) {
            accentToggle.checked = false;
            accentToggle.disabled = true;
            if (accentColorContainer) accentColorContainer.classList.add('hidden');
            document.documentElement.style.removeProperty('--accent');
        }
        updateCachedColor();
    } else {
        const th = settings.theme || 'blue';
        document.documentElement.setAttribute('data-theme', th);
        currentVisualizerStyle = settings.visualizerStyle || 'bars';
        if (visualizerStyleSelect) visualizerStyleSelect.value = currentVisualizerStyle;
        applyAnimationSetting(settings.animationMode || 'flow');
        if (animationSelect) animationSelect.value = settings.animationMode || 'flow';
        const et = settings.coverEmoji || 'note';
        updateEmoji(et, settings.customCoverEmoji);
        if (emojiSelect) emojiSelect.value = et;

        if (accentToggle) {
            accentToggle.disabled = false;
            accentToggle.checked = !!settings.useCustomColor;
            if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !accentToggle.checked);
            if (accentToggle.checked) {
                document.documentElement.style.setProperty('--accent', settings.customAccentColor || '#38bdf8');
            }
        }
        updateCachedColor();
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
    const s = await window.api.getSettings();
    if (s) settings = s;
    if (settings.favorites) {
        favorites = settings.favorites;
        favoritesSet = new Set(favorites);
    }
    
    if (toggleFavoritesOption) {
        toggleFavoritesOption.checked = settings.enableFavoritesPlaylist || false;
        if (toggleFavoritesBtn) toggleFavoritesBtn.style.display = settings.enableFavoritesPlaylist ? 'flex' : 'none';
    }

    if (toggleMiniMode) {
        // App always starts in normal mode to avoid startup bugs
        toggleMiniMode.checked = false;
        document.body.classList.remove('is-mini');
    }
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
    if (toggleEnableFocus) toggleEnableFocus.checked = settings.enableFocusMode !== false;
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

    // Load FPS Limit
    targetFps = settings.targetFps || 60;
    const fpsIn = document.getElementById('fps-input');
    const fpsSl = document.getElementById('fps-slider');
    if (fpsIn) fpsIn.value = targetFps;
    if (fpsSl) fpsSl.value = targetFps;

    // Load Performance Mode
    performanceMode = settings.performanceMode || false;
    const pmToggle = document.getElementById('toggle-performance-mode');
    if (pmToggle) pmToggle.checked = performanceMode;
    if (performanceMode) setPerformanceMode(true);

        // Load Snuggle Time

        const stToggle = document.getElementById('toggle-snuggle-time');

        if (stToggle) {

            const enabled = !!settings.snuggleTimeEnabled;

            stToggle.checked = enabled;

            // Apply logic immediately to ensure all effects are forced

            setTimeout(() => {

                applySnuggleTime(enabled);

            }, 150);

        }

    // Load Stats Overlay
    showStatsOverlay = settings.showStatsOverlay || false;
    const statsToggle = document.getElementById('toggle-show-stats');
    const statsOverlay = document.getElementById('stats-overlay');
    if (statsToggle) statsToggle.checked = showStatsOverlay;
    if (statsOverlay) statsOverlay.classList.toggle('hidden', !showStatsOverlay);

    // Start Stats Loop
    if (!isStatsLoopRunning) {
        updateCachedColor();
        requestAnimationFrame(updatePerformanceStats);
    }

    updateAudioEffects();

    if (speedSlider) { const sp = settings.playbackSpeed || 1.0; speedSlider.value = sp; audio.playbackRate = sp; if(speedValue) speedValue.textContent = sp.toFixed(1) + 'x'; }
    
    // Snuggle Time Master Override at the end of loading
    if (settings.snuggleTimeEnabled) {
        const stToggle = document.getElementById('toggle-snuggle-time');
        if (stToggle) stToggle.checked = true;
        // Longer timeout to ensure Electron settings are fully synchronized with the DOM
        setTimeout(() => {
            applySnuggleTime(true);
        }, 250);
    }

    if (settings.currentFolderPath && (settings.autoLoadLastFolder !== false)) { 
        currentFolderPath = settings.currentFolderPath; 
        try { 
            const result = await window.api.refreshMusicFolder(currentFolderPath); 
            if (result && result.tracks) { 
                basePlaylist = result.tracks; 
                sortPlaylist(sortMode); 
                updateUIForCurrentTrack(); 
            } 
        } catch (e) { 
            console.error(e); 
        } 
    }
    if (shuffleBtn) shuffleBtn.classList.toggle('mode-btn--active', shuffleOn);
    if (loopBtn) { loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); updateLoopIcon(); }
    if (langButtons) langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === currentLanguage));

    // Snuggle Time Master Override - ABSOLUTELY LAST STEP
    if (settings.snuggleTimeEnabled) {
        const stToggle = document.getElementById('toggle-snuggle-time');
        if (stToggle) stToggle.checked = true;
        setTimeout(() => {
            applySnuggleTime(true);
        }, 400); // 400ms to be safe
    }
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
    const isMini = document.body.classList.contains('is-mini');
    const interval = isMini ? 800 : 400; // Slower spawn in mini mode
    
    const createSnowflake = () => {
        if (!backgroundAnimationEl) return;
        const flake = document.createElement('span');
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = Math.random() * 5 + 5 + 's';
        flake.style.opacity = isMini ? (Math.random() * 0.4 + 0.2) : (Math.random() * 0.7 + 0.3);
        flake.style.fontSize = isMini ? (Math.random() * 6 + 8) + 'px' : (Math.random() * 10 + 12) + 'px';
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
    snowInterval = setInterval(createSnowflake, interval);
}
function formatTime(s) { if (isNaN(s)) return '0:00'; const m = Math.floor(s / 60), sc = Math.floor(s % 60).toString().padStart(2, '0'); return `${m}:${sc}`; }

function updateDebugSize() {
    const sizeEl = document.getElementById('stat-size');
    const debugItem = document.getElementById('debug-size-item');
    if (sizeEl && debugItem && !debugItem.classList.contains('hidden')) {
        sizeEl.textContent = `${window.innerWidth} x ${window.innerHeight}`;
    }
}

function getVolumeIcon(v) {
    if (v === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    if (v < 0.5) return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

function toggleFavorite(path) {
    const index = favorites.indexOf(path);
    if (index === -1) {
        favorites.push(path);
        favoritesSet.add(path);
    } else {
        favorites.splice(index, 1);
        favoritesSet.delete(path);
    }
    window.api.setSetting('favorites', favorites);
    renderPlaylist();
    updateUIForCurrentTrack(); // Refresh the main star if it's the currently playing track
    // If we are in favorites view and removed one, we might need to refresh filtering
    if (showingFavoritesOnly) filterPlaylist(searchInput ? searchInput.value : '');
}

function filterPlaylist(q) { 

    let filtered = [...basePlaylist];

    

    if (showingFavoritesOnly) {
        filtered = filtered.filter(t => favoritesSet.has(t.path));
    }

    

    if (q) {

        const lowerQ = q.toLowerCase();

        filtered = filtered.filter(t => t.title.toLowerCase().includes(lowerQ) || (t.artist && t.artist.toLowerCase().includes(lowerQ)));

    }

    

    playlist = filtered;

    if (currentTrackPath) {

        currentIndex = playlist.findIndex(t => t.path === currentTrackPath);

    }

    renderPlaylist(); 

}



function sortPlaylist(m) { 

    const srt = [...basePlaylist]; 

    if (m === 'name') srt.sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true })); 

    else if (m === 'nameDesc') srt.sort((a, b) => b.title.localeCompare(a.title, 'de', { numeric: true })); 

        else if (m === 'newest') srt.sort((a, b) => (b.mtime || 0) - (a.mtime || 0)); 

        basePlaylist = srt; 

        

        // Refresh the filtered playlist based on the new base sorting

        filterPlaylist(searchInput ? searchInput.value : '');

    }
function showContextMenu(e, idx) { 
    contextTrackIndex = idx; 
    if (!contextMenu) return; 
    if (contextMenuFavorite && playlist[idx]) {
        const isFav = favorites.includes(playlist[idx].path);
        contextMenuFavorite.textContent = isFav ? tr('removeFromFavorites') : tr('addToFavorites');
    }
    contextMenu.style.top = `${e.clientY}px`; 
    contextMenu.style.left = `${e.clientX}px`; 
    contextMenu.style.display = 'block'; 
    const hcm = () => { contextMenu.style.display = 'none'; window.removeEventListener('click', hcm); }; 
    window.addEventListener('click', hcm); 
}
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
    bind(loadFolderBtn, 'click', async () => { 
        const r = await window.api.selectMusicFolder(); 
        if (r && r.tracks) { 
            basePlaylist = r.tracks; 
            playlist = [...basePlaylist]; 
            currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
            renderPlaylist(); 
            updateUIForCurrentTrack(); 
            currentFolderPath = r.folderPath; 
            window.api.setSetting('currentFolderPath', currentFolderPath); 
            libraryOverlay.classList.remove('visible'); 
        } 
    });
    bind(refreshFolderBtn, 'click', async () => { 
        let path = currentFolderPath || settings.currentFolderPath; 
        if (!path) return; 
        const r = await window.api.refreshMusicFolder(path); 
        if (r && r.tracks) { 
            currentFolderPath = r.folderPath; 
            window.api.setSetting('currentFolderPath', currentFolderPath); 
            basePlaylist = r.tracks; 
            sortPlaylist(sortMode); 
            if (currentTrackPath) currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
            updateUIForCurrentTrack(); 
            settingsOverlay.classList.remove('visible'); 
        } 
    });
    let st; bind(searchInput, 'input', (e) => { clearTimeout(st); st = setTimeout(() => { filterPlaylist(e.target.value); }, 250); });
    
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        pressedKeys.add(key);

        // Hotkey: CTRL + 1 (Dev Info)
        if (pressedKeys.has('control') && pressedKeys.has('1') && pressedKeys.size === 2) {
            e.preventDefault();
            const devModal = document.getElementById('dev-modal-overlay');
            // Nur öffnen, wenn es nicht bereits sichtbar ist
            if (devModal && !devModal.classList.contains('visible')) {
                devModal.classList.add('visible');
            }
            return;
        }

        // Hotkey: CTRL + 1 + X
        if (pressedKeys.has('control') && pressedKeys.has('1') && pressedKeys.has('x')) {
            e.preventDefault();
            triggerPerformanceHint(true);
            return;
        }

        // Hotkey: CTRL + 1 + H (Debug Size)
        if (pressedKeys.has('control') && pressedKeys.has('1') && pressedKeys.has('h')) {
            e.preventDefault();
            const debugEl = document.getElementById('debug-size-item');
            const statsOverlay = document.getElementById('stats-overlay');
            if (debugEl && statsOverlay) {
                const isHidden = debugEl.classList.contains('hidden');
                debugEl.classList.toggle('hidden', !isHidden);
                if (isHidden) {
                    statsOverlay.classList.remove('hidden');
                    updateDebugSize();
                }
            }
            return;
        }

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.code) { 
            case 'Space': e.preventDefault(); if (isPlaying) audio.pause(); else audio.play(); break; 
            case 'ArrowRight': 
                if (e.shiftKey) {
                    audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
                } else {
                    playNext(); 
                }
                break; 
            case 'ArrowLeft': 
                if (e.shiftKey) {
                    audio.currentTime = Math.max(0, audio.currentTime - 5);
                } else {
                    playPrev(); 
                }
                break; 
            case 'ArrowUp': e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.05); break; 
            case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); break; 
        }
    });

    window.addEventListener('keyup', (e) => {
        pressedKeys.delete(e.key.toLowerCase());
    });
    bind(toggleMiniMode, 'change', (e) => { 
        const isMini = e.target.checked;
        if (isMini) {
            document.body.classList.add('is-mini');
            window.api.setWindowSize(340, 520); 
        } else {
            document.body.classList.remove('is-mini');
            window.api.setWindowSize(1300, 900); 
        }
        // Refresh animation to apply Mini-Player specific adjustments (like snowflake size)
        const currentAnim = (animationSelect) ? animationSelect.value : (settings.animationMode || 'off');
        if (currentAnim === 'xmas') {
            applyAnimationSetting('xmas');
        }
    });
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
    bind(themeSelect, 'change', (e) => { 
        const th = e.target.value; 
        document.documentElement.setAttribute('data-theme', th); 
        window.api.setSetting('theme', th);
        setTimeout(updateCachedColor, 100); 
    });
    bind(accentColorPicker, 'input', (e) => { 
        const color = e.target.value; 
        document.documentElement.style.setProperty('--accent', color); 
        updateCachedColor();
    });
    bind(accentColorPicker, 'change', (e) => {
        window.api.setSetting('customAccentColor', e.target.value);
    });
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
                try {
                    const res = await window.api.moveFile(file.path, currentFolderPath);
                    if (res.success) movedCount++;
                } catch (e) {
                    console.error(`Failed to move file: ${file.path}`, e);
                }
            }
            if (movedCount > 0) {
                try {
                    const r = await window.api.refreshMusicFolder(currentFolderPath);
                    if (r && r.tracks) {
                        basePlaylist = r.tracks;
                        sortPlaylist(sortMode);
                        if (currentTrackPath) currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
                        showNotification(tr('tracksAdded', movedCount));
                    }
                } catch (e) {
                    console.error("Failed to refresh folder after drop", e);
                    showNotification(tr('statusError'));
                }
            }
        } else {
            const firstPath = files[0].path;
            try {
                const r = await window.api.refreshMusicFolder(firstPath);
                if (r && r.tracks && r.tracks.length > 0) {
                    basePlaylist = r.tracks; playlist = [...basePlaylist]; 
                    currentIndex = currentTrackPath ? playlist.findIndex(t => t.path === currentTrackPath) : -1;
                    renderPlaylist(); updateUIForCurrentTrack(); currentFolderPath = r.folderPath;
                    window.api.setSetting('currentFolderPath', currentFolderPath);
                    showNotification(tr('loadFolder'));
                }
            } catch (e) {
                console.error("Failed to load folder via drop", e);
                showNotification(tr('statusError'));
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

    // Performance Mode Toggle
    bind(document.getElementById('toggle-performance-mode'), 'change', (e) => {
        setPerformanceMode(e.target.checked);
    });

    // Stats Overlay Toggle
    bind(document.getElementById('toggle-show-stats'), 'change', (e) => {
        showStatsOverlay = e.target.checked;
        settings.showStatsOverlay = showStatsOverlay;
        window.api.setSetting('showStatsOverlay', showStatsOverlay);
        const overlay = document.getElementById('stats-overlay');
        if (overlay) overlay.classList.toggle('hidden', !showStatsOverlay);
    });

    // Snuggle Time Theme-Pack Toggle
    const toggleSnuggleTime = document.getElementById('toggle-snuggle-time');
    bind(toggleSnuggleTime, 'change', (e) => {
        const enabled = e.target.checked;
        settings.snuggleTimeEnabled = enabled;
        window.api.setSetting('snuggleTimeEnabled', enabled);
        applySnuggleTime(enabled);
        showNotification(enabled ? '✨ Snuggle Time Active' : 'Snuggle Time Deactivated');
    });

    // FPS Limit Handlers
    const fpsIn = document.getElementById('fps-input');
    const fpsSl = document.getElementById('fps-slider');
    
    const updateFps = (val, isFinal = false) => {
        let v = parseInt(val);
        if (isNaN(v)) return;

        // While typing, we allow values outside the range briefly, but clamp for the actual engine
        let clamped = Math.max(15, Math.min(120, v));
        
        targetFps = clamped;
        settings.targetFps = clamped;
        window.api.setSetting('targetFps', clamped);

        if (fpsSl) fpsSl.value = clamped;
        
        // Only force the input field value on blur or slider move to not disrupt typing
        if (isFinal && fpsIn) fpsIn.value = clamped;
    };

    bind(fpsIn, 'input', (e) => updateFps(e.target.value));
    bind(fpsIn, 'blur', (e) => updateFps(e.target.value, true));
    bind(fpsSl, 'input', (e) => {
        updateFps(e.target.value);
        if (fpsIn) fpsIn.value = e.target.value;
    });

    // Performance Hint OK Button
    bind(document.getElementById('enable-perf-mode-btn'), 'click', () => {
        setPerformanceMode(true);
        document.getElementById('performance-hint').classList.remove('visible');
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
        showNotification(tr('exportSuccess'));
    });
    bind(toggleUseCustomColor, 'change', (e) => {
        window.api.setSetting('useCustomColor', e.target.checked);
        if (accentColorContainer) accentColorContainer.classList.toggle('hidden', !e.target.checked);
        if (e.target.checked) { 
            const color = accentColorPicker ? accentColorPicker.value : '#38bdf8'; 
            document.documentElement.style.setProperty('--accent', color); 
        } else { 
            document.documentElement.style.removeProperty('--accent'); 
        }
        setTimeout(updateCachedColor, 50);
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
    bind(playlistEl, 'click', (e) => { 
        const db = e.target.closest('.delete-track-btn'); 
        if (db) { e.stopPropagation(); handleDeleteTrack(db.dataset.path); return; } 
        const fb = e.target.closest('.fav-track-btn');
        if (fb) { e.stopPropagation(); toggleFavorite(fb.dataset.path); return; }
        const row = e.target.closest('.track-row'); 
        if (row) playTrack(parseInt(row.dataset.index, 10)); 
    });
    bind(playlistEl, 'contextmenu', (e) => { const r = e.target.closest('.track-row'); if (r) { e.preventDefault(); showContextMenu(e, parseInt(r.dataset.index, 10)); } });
    bind($('#context-menu-show-folder'), 'click', () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; window.api.showInFolder(playlist[contextTrackIndex].path); });
    bind(toggleDownloaderBtn, 'click', () => { downloaderOverlay.classList.add('visible'); });
    
    bind(toggleFavoritesBtn, 'click', () => {
        showingFavoritesOnly = !showingFavoritesOnly;
        toggleFavoritesBtn.classList.toggle('active', showingFavoritesOnly);
        toggleFavoritesBtn.style.color = showingFavoritesOnly ? 'var(--accent)' : 'var(--text-main)';
        filterPlaylist(searchInput ? searchInput.value : '');
    });

    bind(toggleFavoritesOption, 'change', (e) => {
        const enabled = e.target.checked;
        window.api.setSetting('enableFavoritesPlaylist', enabled);
        if (toggleFavoritesBtn) toggleFavoritesBtn.style.display = enabled ? 'flex' : 'none';
        if (!enabled && showingFavoritesOnly) {
            showingFavoritesOnly = false;
            if (toggleFavoritesBtn) toggleFavoritesBtn.classList.remove('active');
            filterPlaylist(searchInput ? searchInput.value : '');
        }
    });

    bind(contextMenuFavorite, 'click', () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        toggleFavorite(playlist[contextTrackIndex].path);
    });

    bind(mainFavoriteBtn, 'click', () => {
        if (currentIndex === -1 || !playlist[currentIndex]) return;
        toggleFavorite(playlist[currentIndex].path);
        updateUIForCurrentTrack(); // Refresh the main star color
    });
    bind(downloaderCloseBtn, 'click', () => { downloaderOverlay.classList.remove('visible'); });
    bind(contextMenuEditTitle, 'click', () => { if (contextTrackIndex === null) return; const t = playlist[contextTrackIndex]; if (originalTitlePreview) originalTitlePreview.textContent = t.title; if (newTitlePreview) newTitlePreview.textContent = t.title; if (editTitleInput) editTitleInput.value = t.title; editTitleOverlay.classList.add('visible'); });
    bind(editTitleInput, 'input', () => { if (newTitlePreview) newTitlePreview.textContent = editTitleInput.value; });
    bind(editTitleCancelBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleCloseBtn, 'click', () => { editTitleOverlay.classList.remove('visible'); });
    bind(editTitleSaveBtn, 'click', async () => { if (contextTrackIndex === null || !playlist[contextTrackIndex]) return; const t = playlist[contextTrackIndex]; const nt = editTitleInput.value.trim(); if (!nt) return; const r = await window.api.updateTitle(t.path, nt); if (r.success) { t.title = nt; const bt = basePlaylist.find(x => x.path === t.path); if (bt) bt.title = nt; renderPlaylist(); updateUIForCurrentTrack(); editTitleOverlay.classList.remove('visible'); showNotification(tr('titleUpdated')); } });
    bind(confirmDeleteCancelBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteCloseBtn, 'click', () => { confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; });
    bind(confirmDeleteBtn, 'click', async () => { if (!trackToDeletePath) return; const ctp = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null; const r = await window.api.deleteTrack(trackToDeletePath); if (r.success) { 
        basePlaylist = basePlaylist.filter(x => x.path !== trackToDeletePath); 
        playlist = playlist.filter(x => x.path !== trackToDeletePath);
        // Remove from favorites if it was one
        const favIdx = favorites.indexOf(trackToDeletePath);
        if (favIdx !== -1) {
            favorites.splice(favIdx, 1);
            window.api.setSetting('favorites', favorites);
        }
        if (ctp) { if (trackToDeletePath === ctp) { audio.pause(); currentIndex = -1; audio.src = ''; updatePlayPauseUI(); } else { currentIndex = playlist.findIndex(x => x.path === ctp); } } 
        renderPlaylist(); updateUIForCurrentTrack(); confirmDeleteOverlay.classList.remove('visible'); trackToDeletePath = null; showNotification(tr('songDeleted')); } 
    });
    let resTimeout; new ResizeObserver(() => { if (visualizerCanvas && visualizerContainer) { visualizerCanvas.width = visualizerContainer.clientWidth; visualizerCanvas.height = visualizerContainer.clientHeight; } }).observe(visualizerContainer);
    window.addEventListener('resize', () => { 
        clearTimeout(resTimeout); 
        resTimeout = setTimeout(() => {
            updateTrackTitleScroll();
            updateDebugSize();
        }, 100); 
    });
}

function showNotification(msg) {
    if (!notificationBar || !notificationMessage) return; if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationMessage.textContent = msg; notificationBar.classList.remove('visible'); void notificationBar.offsetWidth; notificationBar.classList.add('visible');
    notificationTimeout = setTimeout(() => { notificationBar.classList.remove('visible'); }, 5000);
}

function makeDraggable(modal, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        // Only drag if left mouse button is pressed
        if (e.button !== 0) return;
        
        e.preventDefault();
        
        // Get current position
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Switch to absolute positioning if not already done
        if (modal.style.position !== 'absolute') {
            const rect = modal.getBoundingClientRect();
            modal.style.position = 'absolute';
            modal.style.top = rect.top + "px";
            modal.style.left = rect.left + "px";
            modal.style.transform = 'none';
            modal.style.margin = '0';
        }

        modal.classList.add('is-dragging');
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        modal.style.top = (modal.offsetTop - pos2) + "px";
        modal.style.left = (modal.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        modal.classList.remove('is-dragging');
        document.onmouseup = null;
        document.onmousemove = null;
    }
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
    toggleDownloaderBtn = $('#toggle-downloader-btn'); contextMenu = $('#context-menu'); contextMenuEditTitle = $('#context-menu-edit-title'); contextMenuFavorite = $('#context-menu-favorite');
    editTitleOverlay = $('#edit-title-overlay'); editTitleInput = $('#edit-title-input'); originalTitlePreview = $('#original-title-preview');
    newTitlePreview = $('#new-title-preview'); editTitleCancelBtn = $('#edit-title-cancel-btn'); editTitleSaveBtn = $('#edit-title-save-btn');
    editTitleCloseBtn = $('#edit-title-close-btn');
    toggleFavoritesBtn = $('#toggle-favorites-btn'); toggleFavoritesOption = $('#toggle-favorites-option');
    mainFavoriteBtn = $('#main-favorite-btn');
    confirmDeleteOverlay = $('#confirm-delete-overlay'); confirmDeleteBtn = $('#confirm-delete-btn'); confirmDeleteCancelBtn = $('#confirm-delete-cancel-btn');
    confirmDeleteCloseBtn = $('#confirm-delete-close-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder'); toggleMiniMode = $('#toggle-mini-mode');
    notificationBar = $('#notification-bar'); notificationMessage = $('#notification-message');
    
    // Dev Modal Elements
    const devModalOverlay = $('#dev-modal-overlay');
    const devModalCloseBtn = $('#dev-modal-close-btn');

    // User Help Modal Elements
    const userHelpOverlay = $('#user-help-overlay');
    const userHelpBtn = $('#user-help-btn');
    const userHelpCloseBtn = $('#user-help-close-btn');

    if (userHelpBtn && userHelpOverlay) {
        userHelpBtn.addEventListener('click', () => userHelpOverlay.classList.add('visible'));
    }
    if (userHelpCloseBtn && userHelpOverlay) {
        userHelpCloseBtn.addEventListener('click', () => userHelpOverlay.classList.remove('visible'));
    }

    // Help to Settings Quick Button
    const helpToSettingsBtn = $('#help-to-settings-btn');
    if (helpToSettingsBtn) {
        helpToSettingsBtn.addEventListener('click', () => {
            if (userHelpOverlay) userHelpOverlay.classList.remove('visible');
            setTimeout(() => {
                if (settingsOverlay) settingsOverlay.classList.add('visible');
            }, 300);
        });
    }

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

    const overlays = [settingsOverlay, libraryOverlay, downloaderOverlay, editTitleOverlay, confirmDeleteOverlay, document.getElementById('dev-modal-overlay'), document.getElementById('user-help-overlay')];
    overlays.forEach(ov => { 
        if (ov) {
            const modal = ov.querySelector('.settings-modal');
            const header = ov.querySelector('.settings-header');
            if (modal && header) makeDraggable(modal, header);

            ov.addEventListener('click', (e) => { 
                if (e.target === ov) {
                    ov.classList.remove('visible');
                    // Reset position after fade out
                    setTimeout(() => {
                        if (modal) {
                            modal.style.position = '';
                            modal.style.top = '';
                            modal.style.left = '';
                            modal.style.transform = '';
                            modal.style.margin = '';
                        }
                    }, 300);
                }
            }); 
        }
    });

    // Also reset on specific close buttons
    document.querySelectorAll('.close-modal-btn, #settings-close-btn, #edit-title-cancel-btn, #confirm-delete-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ov = btn.closest('.overlay-container');
            if (ov) {
                const modal = ov.querySelector('.settings-modal');
                setTimeout(() => {
                    if (modal) {
                        modal.style.position = '';
                        modal.style.top = '';
                        modal.style.left = '';
                        modal.style.transform = '';
                        modal.style.margin = '';
                    }
                }, 300);
            }
        });
    });

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
            updateCachedColor(); // Update color cache after applying theme/custom settings
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