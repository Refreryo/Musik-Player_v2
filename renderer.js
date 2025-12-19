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
let deleteSongsEnabled = false;
let currentFolderPath = null;
let contextTrackIndex = null;

// Visualizer State
let audioContext, analyser, sourceNode;
let visualizerDataArray;
let visualizerRunning = false;

// DOM Elements (will be assigned on DOMContentLoaded)
let $, trackTitleEl, trackArtistEl, musicEmojiEl, currentTimeEl, durationEl, progressBar, progressFill, playBtn, playIcon, pauseIcon, prevBtn, nextBtn, loopBtn, shuffleBtn, volumeSlider, volumeIcon, playlistEl, playlistInfoBar, loadFolderBtn, searchInput, sortSelect, ytUrlInput, ytNameInput, downloadBtn, downloadStatusEl, downloadProgressFill, visualizerCanvas, visualizerContainer, langButtons, settingsBtn, settingsOverlay, settingsCloseBtn, downloadFolderInput, changeFolderBtn, qualitySelect, themeSelect, visualizerToggle, animationSelect, backgroundAnimationEl, emojiSelect, customEmojiContainer, customEmojiInput, toggleDownloaderBtn, downloaderPanel, contextMenu, contextMenuEditTitle, editTitleOverlay, editTitleInput, originalTitlePreview, newTitlePreview, editTitleCancelBtn, editTitleSaveBtn, confirmDeleteOverlay, confirmDeleteBtn, confirmDeleteCancelBtn, autoLoadLastFolderToggle;

let trackToDeletePath = null;
let toggleMiniMode;

// =================================================================================
// TRANSLATIONS
// =================================================================================

const translations = {

    de: {

        appTitle: 'NovaWave - Musik Player', appSubtitle: 'Lokal & YouTube',

        nothingPlaying: 'Nichts spielt', unknownArtist: 'Unbekannter Künstler',

        loadFolder: 'Ordner laden', refreshFolder: 'Aktualisieren', searchPlaceholder: 'Playlist durchsuchen...',

        emptyPlaylist: 'Playlist ist leer. Lade einen Ordner!',

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

        sectionDownloads: 'Downloads',

        defaultDownloadFolderDescription: 'Lege den Standardordner für alle YouTube-Downloads fest.',

        audioQualityDescription: 'Wähle die Audioqualität für neue YouTube-Downloads.',

        autoLoadLastFolder: 'Zuletzt benutzten Ordner automatisch laden',
        autoLoadLastFolderDescription: 'Wenn aktiviert, wird der zuletzt benutzte Ordner beim Start der App automatisch geladen.',

        animOff: 'Aus', animFlow: 'Flow', animNebula: 'Nebula', animRainbow: 'Regenbogen',
    },

    en: {

        appTitle: 'NovaWave - Music Player', appSubtitle: 'Local & YouTube',

        nothingPlaying: 'Nothing Playing', unknownArtist: 'Unknown Artist',

        loadFolder: 'Load Folder', refreshFolder: 'Refresh', searchPlaceholder: 'Search playlist...',

        emptyPlaylist: 'Playlist is empty. Load a folder!',

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

        sectionDownloads: 'Downloads',

        defaultDownloadFolderDescription: 'Set the default folder for all YouTube downloads.',

        audioQualityDescription: 'Choose the audio quality for new YouTube downloads.',

        autoLoadLastFolder: 'Automatically load last used folder',
        autoLoadLastFolderDescription: 'If enabled, the last used folder will be loaded automatically when the app starts.',

        animOff: 'Off', animFlow: 'Flow', animNebula: 'Nebula', animRainbow: 'Rainbow',
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

        updateActiveTrackInPlaylist();

        return;

    }

    const track = playlist[currentIndex];

    trackTitleEl.textContent = track.title;

    trackArtistEl.textContent = track.artist || tr('unknownArtist');

    updateActiveTrackInPlaylist();

}



function updatePlayPauseUI() {

    playIcon.style.display = isPlaying ? 'none' : 'block';

    pauseIcon.style.display = isPlaying ? 'block' : 'none';

    // Also update the icon in the playlist if it's visible
    updateActiveTrackInPlaylist();
}



function updateActiveTrackInPlaylist() {
    if (!playlistEl) return;
    
    // 1. Remove active class and icon from previously active row
    const previousActive = playlistEl.querySelector('.track-row.active');
    if (previousActive) {
        previousActive.classList.remove('active');
        const indexVal = previousActive.dataset.index;
        // Restore the index number
        const indexEl = previousActive.querySelector('.track-index');
        if (indexEl) indexEl.textContent = parseInt(indexVal) + 1; 
    }

    // 2. Add active class and icon to new active row
    if (currentIndex !== -1) {
        const newActive = playlistEl.querySelector(`.track-row[data-index="${currentIndex}"]`);
        if (newActive) {
            newActive.classList.add('active');
            const indexEl = newActive.querySelector('.track-index');
            
            // Show playing icon or index depending on isPlaying state? 
            // The original code showed icon only if isPlaying & active.
            // But usually, an active track shows an icon (maybe paused state) or number.
            // Let's stick to original behavior: Show icon if active.
            
            const playingIcon = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
            
            // If we want to show a "pause" icon in the list when paused, we could do that too.
            // For now, let's just show the play icon if it's the current track, 
            // matching the previous logic: `isPlaying && index === currentIndex ? playingIcon : index + 1`
            // Actually, the previous logic only showed the icon if `isPlaying` was true.
            
            if (isPlaying) {
                if (indexEl) indexEl.innerHTML = playingIcon;
            } else {
                 // If paused but active, maybe just keep the number or a different style?
                 // The original code fell back to `index + 1` if !isPlaying.
                 if (indexEl) indexEl.textContent = currentIndex + 1;
            }
        }
    }
}


let renderPlaylistRequestId = null;

function renderPlaylist() {
    if (!playlistEl) return;
    
    // Cancel any ongoing render to prevent overlap
    if (renderPlaylistRequestId) {
        cancelAnimationFrame(renderPlaylistRequestId);
        renderPlaylistRequestId = null;
    }
    
    playlistEl.innerHTML = '';
    
    if (playlist.length === 0) {
        playlistEl.innerHTML = `<div class="empty-state">${tr('emptyPlaylist')}</div>`;
        playlistInfoBar.textContent = `0 ${tr('tracks')}`;
        return;
    }
    
    playlistInfoBar.textContent = `${playlist.length} ${playlist.length === 1 ? tr('track') : tr('tracks')}`;

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

            const playingIcon = `<svg class="track-playing-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
            const deleteButtonHtml = deleteSongsEnabled ? `
                <button class="delete-track-btn" data-path="${track.path}" title="${tr('deleteSong')}" data-lang-title="deleteSong">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </button>` : '';

            const indexDisplay = (isPlaying && i === currentIndex) ? playingIcon : (i + 1);

            row.innerHTML = `
                <div class="track-index">${indexDisplay}</div>
                <div class="track-info-block">
                    <div class="track-title-small">${track.title}</div>
                    <div class="track-artist-small">${track.artist || tr('unknownArtist')}</div>
                </div>
                <div class="track-duration">${formatTime(track.duration)}</div>
                ${deleteButtonHtml}
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







function updateEmoji(emojiType, customEmoji) {
    let emoji = '🎵'; // Default
    if (emojiType === 'note') {
        emoji = '🎵';
    } else if (emojiType === 'dino') {
        emoji = '🦖';
    } else if (emojiType === 'custom') {
        if (customEmoji && customEmoji.trim() !== '') {
            emoji = customEmoji.trim();
        }
    }
    musicEmojiEl.textContent = emoji;
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



function setupVisualizer() {
    if (audioContext) return; // Already setup

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
        visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
        console.error("Failed to initialize visualizer:", e);
        visualizerEnabled = false; // Disable if setup fails
    }
}



function startVisualizer() {

    if (!audioContext || visualizerRunning || !visualizerEnabled || !isPlaying) {

        return;

    }

    if (audioContext.state === 'suspended') {

        audioContext.resume();

    }

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

    if (!visualizerRunning || !isPlaying || !visualizerEnabled) {
        visualizerRunning = false; // Ensure it stops
        return;
    }

    requestAnimationFrame(drawVisualizer);

    if (!visualizerDataArray) return;
    analyser.getByteFrequencyData(visualizerDataArray);

    const ctx = visualizerCanvas.getContext('2d');
    const { width, height } = visualizerCanvas;
    ctx.clearRect(0, 0, width, height);

    const bufferLength = analyser.frequencyBinCount;
    const halfBuffer = bufferLength / 2;
    const barWidth = (width / halfBuffer) / 2;
    let x = 0;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent');

    for (let i = 0; i < halfBuffer; i++) {
        const barHeight = (visualizerDataArray[i] / 255) * height * 0.9;
        ctx.fillStyle = accentColor;
        // Draw right bar
        ctx.fillRect(width / 2 + x, height - barHeight, barWidth, barHeight);
        // Draw left bar
        ctx.fillRect(width / 2 - x - barWidth, height - barHeight, barWidth, barHeight);
        x += barWidth + 1; // +1 for spacing
    }

    // Emoji Animation
    if (musicEmojiEl && !isNaN(audio.currentTime)) {
        const bassBins = visualizerDataArray.slice(0, 2);
        const bassLevel = bassBins.reduce((a, b) => a + b, 0) / bassBins.length;
        const floatAmplitude = 10;
        const floatY = Math.sin(audio.currentTime * 2) * floatAmplitude;
        const bassThreshold = 180;
        const bassScaleMultiplier = 0.15;
        let jumpScale = 1;
        if (bassLevel > bassThreshold) {
            const excess = Math.min((bassLevel - bassThreshold) / 50, 1);
            jumpScale = 1 + excess * bassScaleMultiplier;
        }
        musicEmojiEl.style.transform = `translateY(${floatY}px) scale(${jumpScale})`;
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

        startVisualizer();
        window.api.sendPlaybackState(true);

    });



    audio.addEventListener('pause', () => {

        isPlaying = false;

        updatePlayPauseUI();

        stopVisualizer();
        window.api.sendPlaybackState(false);

    });



    audio.addEventListener('ended', () => {

        stopVisualizer();

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

        window.api.setSetting('volume', currentVolume);

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

    // Audio & UI settings
    currentVolume = settings.volume || 0.2;
    audio.volume = currentVolume;
    shuffleOn = settings.shuffle || false;
    loopMode = settings.loop || 'off';
    currentLanguage = settings.language || 'de';
    
    // UI elements
    if (downloadFolderInput) { downloadFolderInput.value = settings.downloadFolder; }
    if (qualitySelect) { qualitySelect.value = settings.audioQuality; }
    if (animationSelect) {
        let mode = settings.animationMode;
        if (!mode) {
             // Fallback for old settings
             mode = (settings.animationsEnabled !== false) ? 'flow' : 'off';
        }
        animationSelect.value = mode;
        applyAnimationSetting(mode);
    }
    if (themeSelect) { themeSelect.value = settings.theme || 'blue'; }
    if (visualizerToggle) {
        visualizerToggle.checked = settings.visualizerEnabled !== false;
        visualizerEnabled = settings.visualizerEnabled !== false;
    }
    if (toggleDeleteSongs) {
        toggleDeleteSongs.checked = settings.deleteSongsEnabled || false;
        deleteSongsEnabled = settings.deleteSongsEnabled || false;
    }
    if (autoLoadLastFolderToggle) {
        autoLoadLastFolderToggle.checked = settings.autoLoadLastFolder !== false;
    }
    if (settings.currentFolderPath && (settings.autoLoadLastFolder !== false)) {
        currentFolderPath = settings.currentFolderPath;
        if (refreshFolderBtn) { refreshFolderBtn.disabled = false; }
        const result = await window.api.refreshMusicFolder(currentFolderPath);
        if (result && result.tracks) {
            basePlaylist = result.tracks;
            playlist = [...basePlaylist];
            currentIndex = -1;
            renderPlaylist();
            updateUIForCurrentTrack();
        }
    } else {
        if (refreshFolderBtn) { refreshFolderBtn.disabled = true; }
    }
    
    // Emoji Settings
    const coverEmoji = settings.coverEmoji || 'note';
    const customCoverEmoji = settings.customCoverEmoji || '🎵';
    if (emojiSelect) { emojiSelect.value = coverEmoji; }
    if (customEmojiInput) { customEmojiInput.value = customCoverEmoji; }
    updateEmoji(coverEmoji, customCoverEmoji);
    if (customEmojiContainer) {
        customEmojiContainer.style.display = coverEmoji === 'custom' ? 'grid' : 'none';
    }

    // Downloader visibility
    const downloaderVisible = settings.downloaderVisible !== false;
    if (downloaderPanel) {
        downloaderPanel.style.display = downloaderVisible ? 'flex' : 'none';
    }
    if (toggleDownloaderBtn) {
        toggleDownloaderBtn.classList.toggle('mode-btn--active', downloaderVisible);
    }

    // Apply loaded settings to UI
    // applyAnimationSetting is called above
    if (shuffleBtn) { shuffleBtn.classList.toggle('mode-btn--active', shuffleOn); }
    if (loopBtn) { loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off'); }
    if (langButtons) { langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === currentLanguage)); }
}



function applyAnimationSetting(mode) {
    if (!backgroundAnimationEl) return;
    backgroundAnimationEl.className = 'background-animation'; // Reset classes
    if (mode && mode !== 'off') {
        backgroundAnimationEl.style.display = 'block';
        backgroundAnimationEl.classList.add(`type-${mode}`);
    } else {
        backgroundAnimationEl.style.display = 'none';
    }
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







function showContextMenu(e, index) {



    contextTrackIndex = index;



    contextMenu.style.top = `${e.clientY}px`;



    contextMenu.style.left = `${e.clientX}px`;



    contextMenu.style.display = 'block';







    const hideContextMenu = () => {



        contextMenu.style.display = 'none';



        window.removeEventListener('click', hideContextMenu);



    };



    window.addEventListener('click', hideContextMenu);



}







function handleDeleteTrack(filePath) {
    trackToDeletePath = filePath;
    confirmDeleteOverlay.classList.add('visible');

    let countdown = 5;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${countdown})`;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            confirmDeleteBtn.textContent = `${tr('confirmDeleteButton')} (${countdown})`;
        } else {
            clearInterval(countdownInterval);
            confirmDeleteBtn.textContent = tr('confirmDeleteButton');
            confirmDeleteBtn.disabled = false;
        }
    }, 1000);
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

        window.api.setSetting('shuffle', shuffleOn);

    });

    bind(loopBtn, 'click', () => {

        loopMode = loopMode === 'off' ? 'all' : (loopMode === 'all' ? 'one' : 'off');

        loopBtn.classList.toggle('mode-btn--active', loopMode !== 'off');

        window.api.setSetting('loop', loopMode);

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

                    currentFolderPath = result.folderPath; // Save current folder path

                    window.api.setSetting('currentFolderPath', currentFolderPath);

                    refreshFolderBtn.disabled = false; // Enable refresh button

                }

            });

        

            bind(refreshFolderBtn, 'click', async () => {
                if (!currentFolderPath) return;
        
                const result = await window.api.refreshMusicFolder(currentFolderPath);
                if (result && result.tracks) {
                    basePlaylist = result.tracks;
                    // Re-apply sort which updates playlist and renders it
                    sortPlaylist(sortMode);
                    updateUIForCurrentTrack();
                } else if (result && result.error) {
                    alert(`${tr('statusError')}: ${result.error}`);
                }
            });

    bind(toggleMiniMode, 'change', (e) => {
        const isMini = e.target.checked;
        if (isMini) {
            // Switch to Mini Mode
            window.api.setWindowSize(340, 520);
        } else {
            // Switch back to Normal Mode
            window.api.setWindowSize(1300, 900);
        }
    });

    bind(searchInput, 'input', (e) => filterPlaylist(e.target.value));

    bind(downloadBtn, 'click', handleDownload);

    window.api.onMediaControl((action) => {
        switch (action) {
            case 'play-pause':
                if (isPlaying) {
                    audio.pause();
                } else {
                    if (currentIndex === -1) {
                        playTrack(0);
                    } else {
                        audio.play();
                    }
                }
                break;
            case 'next':
                playNext();
                break;
            case 'previous':
                playPrev();
                break;
        }
    });

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

            window.api.setSetting('language', currentLanguage);

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

    bind(settingsBtn, 'click', () => { settingsOverlay.classList.add('visible'); });

    bind(settingsCloseBtn, 'click', () => { settingsOverlay.classList.remove('visible'); });

    bind(settingsOverlay, 'click', (e) => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('visible'); });

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

        if (visualizerEnabled) {

            startVisualizer();

        } else {

            stopVisualizer();

        }

    });

    bind(animationSelect, 'change', (e) => {
        const mode = e.target.value;
        window.api.setSetting('animationMode', mode);
        // Also update legacy setting for backward compatibility if needed, or just rely on mode
        window.api.setSetting('animationsEnabled', mode !== 'off'); 
        applyAnimationSetting(mode);
    });

    

    bind(autoLoadLastFolderToggle, 'change', (e) => {

        const enabled = e.target.checked;

        window.api.setSetting('autoLoadLastFolder', enabled);

    });



                bind(emojiSelect, 'change', (e) => {



                    const selected = e.target.value;



                    customEmojiContainer.style.display = selected === 'custom' ? 'grid' : 'none';



                    window.api.setSetting('coverEmoji', selected);



                    updateEmoji(selected, customEmojiInput.value);



                });



    



            bind(customEmojiInput, 'input', (e) => {



    



                const customEmoji = e.target.value;



    



                window.api.setSetting('customCoverEmoji', customEmoji);



    



                updateEmoji('custom', customEmoji);



    



            });

    bind(toggleDeleteSongs, 'change', (e) => {
        deleteSongsEnabled = e.target.checked;
        window.api.setSetting('deleteSongsEnabled', deleteSongsEnabled);
        renderPlaylist(); // Re-render to show/hide delete icons
    });

    // Delegated CLICK listener for Playlist
    bind(playlistEl, 'click', (e) => {
        // 1. Handle Delete Button
        const deleteButton = e.target.closest('.delete-track-btn');
        if (deleteButton) {
            e.stopPropagation(); 
            const filePath = deleteButton.dataset.path;
            handleDeleteTrack(filePath);
            return;
        }

        // 2. Handle Track Click
        const row = e.target.closest('.track-row');
        if (row) {
            const index = parseInt(row.dataset.index, 10);
            if (!isNaN(index)) {
                playTrack(index);
            }
        }
    });

    // Delegated CONTEXTMENU listener for Playlist
    bind(playlistEl, 'contextmenu', (e) => {
        const row = e.target.closest('.track-row');
        if (row) {
            e.preventDefault();
            const index = parseInt(row.dataset.index, 10);
            if (!isNaN(index)) {
                showContextMenu(e, index);
            }
        }
    });

    bind(toggleDownloaderBtn, 'click', () => {
        const isVisible = downloaderPanel.style.display !== 'none';
        downloaderPanel.style.display = isVisible ? 'none' : 'flex';
        toggleDownloaderBtn.classList.toggle('mode-btn--active', !isVisible);
        window.api.setSetting('downloaderVisible', !isVisible);
    });

    new ResizeObserver(() => {
        if(visualizerCanvas.width !== visualizerContainer.clientWidth) {
            visualizerCanvas.width = visualizerContainer.clientWidth;
        }
    }).observe(visualizerContainer);
    
    // Context Menu and Edit Modal Listeners
    bind(contextMenuEditTitle, 'click', () => {
        if (contextTrackIndex === null) return;
        const track = playlist[contextTrackIndex];
        originalTitlePreview.textContent = track.title;
        newTitlePreview.textContent = track.title;
        editTitleInput.value = track.title;
        editTitleOverlay.classList.add('visible');
    });

    bind(editTitleCancelBtn, 'click', () => {
        editTitleOverlay.classList.remove('visible');
    });

    bind(editTitleOverlay, 'click', (e) => {
        if (e.target === editTitleOverlay) {
            editTitleOverlay.classList.remove('visible');
        }
    });

    bind(editTitleInput, 'input', () => {
        newTitlePreview.textContent = editTitleInput.value;
    });

    bind(editTitleSaveBtn, 'click', async () => {
        if (contextTrackIndex === null || !playlist[contextTrackIndex]) return;
        
        const track = playlist[contextTrackIndex];
        const newTitle = editTitleInput.value.trim();
        
        if (!newTitle) {
            alert(tr('statusTitleMissing')); // Need to add this translation
            return;
        }
        
        const result = await window.api.updateTitle(track.path, newTitle);
        
        if (result.success) {
            // Update the title in the local playlist data
            track.title = newTitle;
            
            // Find and update in basePlaylist too, to ensure consistency for sorting/filtering
            const baseTrack = basePlaylist.find(t => t.path === track.path);
            if (baseTrack) {
                baseTrack.title = newTitle;
            }
            
            renderPlaylist();
            updateUIForCurrentTrack(); // Update player display if this track is playing
            editTitleOverlay.classList.remove('visible');
        } else {
            alert(`${tr('statusError')}: ${result.error}`); // Use existing statusError translation
        }
    });
        
    // Delete Confirmation Modal Listeners
    bind(confirmDeleteCancelBtn, 'click', () => {
        confirmDeleteOverlay.classList.remove('visible');
        trackToDeletePath = null;
    });
        
    bind(confirmDeleteBtn, 'click', async () => {
        if (!trackToDeletePath) return;
        
        // Capture currently playing track path BEFORE modification
        const currentTrackPath = (currentIndex !== -1 && playlist[currentIndex]) ? playlist[currentIndex].path : null;

        const result = await window.api.deleteTrack(trackToDeletePath);
        
        if (result.success) {
            // Remove track from playlist and basePlaylist
            basePlaylist = basePlaylist.filter(t => t.path !== trackToDeletePath);
            playlist = playlist.filter(t => t.path !== trackToDeletePath);
            
            if (currentTrackPath) {
                 if (trackToDeletePath === currentTrackPath) {
                     // Deleted the playing track
                     audio.pause();
                     currentIndex = -1;
                     audio.src = '';
                     updatePlayPauseUI();
                 } else {
                     // Find new index of the track that was playing
                     currentIndex = playlist.findIndex(t => t.path === currentTrackPath);
                 }
            }
            
            renderPlaylist();
            updateUIForCurrentTrack();
            confirmDeleteOverlay.classList.remove('visible');
            trackToDeletePath = null;
        } else {
            alert(`${tr('statusError')}: ${result.error}`);
        }
    });
        
    bind(confirmDeleteOverlay, 'click', (e) => {
        if (e.target === confirmDeleteOverlay) {
            confirmDeleteOverlay.classList.remove('visible');
            trackToDeletePath = null;
        }
    });
}

// =================================================================================
// APP INITIALIZATION
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
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
    refreshFolderBtn = $('#refresh-folder-btn');
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
    animationSelect = $('#animation-select');
    backgroundAnimationEl = $('.background-animation');
    emojiSelect = $('#emoji-select');
    customEmojiContainer = $('#custom-emoji-container');
    customEmojiInput = $('#custom-emoji-input');
    toggleDeleteSongs = $('#toggle-delete-songs');
    toggleDownloaderBtn = $('#toggle-downloader-btn');
    downloaderPanel = $('.extras-panel');
    contextMenu = $('#context-menu');
    contextMenuEditTitle = $('#context-menu-edit-title');
    editTitleOverlay = $('#edit-title-overlay');
    editTitleInput = $('#edit-title-input');
    originalTitlePreview = $('#original-title-preview');
    newTitlePreview = $('#new-title-preview');
    editTitleCancelBtn = $('#edit-title-cancel-btn');
    editTitleSaveBtn = $('#edit-title-save-btn');
    confirmDeleteOverlay = $('#confirm-delete-overlay');
    confirmDeleteBtn = $('#confirm-delete-btn');
    confirmDeleteCancelBtn = $('#confirm-delete-cancel-btn');
    autoLoadLastFolderToggle = $('#toggle-auto-load-last-folder');
    toggleMiniMode = $('#toggle-mini-mode');

    // Initial setup
    setupAudioEvents();
    setupEventListeners();
    setupVisualizer();
    loadSettings().then(() => {
        document.documentElement.setAttribute('data-theme', settings.theme || 'blue');
        applyTranslations();
    });
    renderPlaylist();
    updatePlayPauseUI();
    audio.volume = currentVolume;
    volumeSlider.value = currentVolume;
    volumeIcon.innerHTML = getVolumeIcon(currentVolume);
});
let trackRowElements = [];


