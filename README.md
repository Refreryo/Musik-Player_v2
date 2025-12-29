# 🌊 NovaWave Music Player

![Version](https://img.shields.io/badge/Version-2.5.0-c1d37f?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Open--Source-4ade80?style=for-the-badge)
![Author](https://img.shields.io/badge/Author-SnuggleDino-fbbf24?style=for-the-badge)

NovaWave is a professional, high-performance music player built with Electron. It combines high-fidelity local playback with a powerful YouTube downloader and advanced audio processing.

***

## 🌟 What's New in v2.5.0?

*   ✨ **Snuggle Time (Theme-Pack):** An exclusive, curated experience featuring warm spring colors, "Loving Dinos" cover art, and a fixed Retro-Pixel visualizer with Snowfall effects.
*   🔲 **Panorama Help Modal:** A redesigned, wide-screen landscape help menu for better readability and detailed control information.
*   🖱️ **Draggable Modals:** All settings and info windows can now be freely moved around the screen by grabbing their headers.
*   🛠️ **Developer Console:** New hidden debug features for performance monitoring and real-time window size analysis.
*   📏 **Ultra-Responsive Layout:** Improved grid system that fluently handles extreme window sizes and orientations.

***

## 🚀 Key Features

*   🔵 **Local Playback:** High-fidelity support for MP3, M4A, FLAC, WAV, and OGG.
*   🔴 **YouTube Downloader:** Built-in engine via `yt-dlp` including automated metadata tagging and thumbnail embedding.
*   🟣 **Glassmorphism UI:** A sleek, modern interface with multiple themes and custom accent color support.
*   ⚪ **Mini-Player:** A redesigned, compact mode that stays on top and focuses on the essentials.
*   ⚫ **Cinema Mode:** A focus mode that dims non-essential UI elements for an immersive visual experience.
*   ⭐ **Favorites:** Mark your top tracks and filter your playlist instantly.
*   🟢 **Drag & Drop:** Add music files or entire folders simply by dragging them into the player.

## 🎧 Audio & Performance

*   🔊 **Audio FX:** Professional Bass Boost, Crystalizer (Treble Enhancement), and Spatial Reverb.
*   🏝️ **Dynamic Island:** Proactive performance monitoring system inspired by modern mobile interfaces.
*   📊 **System Stats:** Live monitoring of FPS, frame time, and stability (Toggle with `CTRL + 1 + H`).
*   🎮 **FPS Limit:** Control your system resources by limiting the frame rate (15 - 120 FPS).

***

## ⌨️ Controls & Hotkeys

### Standard
*   `Space`: Play / Pause
*   `Arrow Right / Left`: Next / Previous track
*   `Arrow Up / Down`: Volume control
*   `Shift + Arrow`: Seek 5 seconds forward / backward

### Developer & Debug
*   `CTRL + 1`: Open Developer & Hotkey Info
*   `CTRL + 1 + H`: Toggle Window Size Debug (Live Dimensions)
*   `CTRL + 1 + X`: Manually trigger Performance Hint

***

## 💻 Installation

> **Note:** Requires [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/) installed on your system.

1. **Clone the Repository**
   ```bash
   git clone https://github.com/SnuggleDino/Musik-Player_v2
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **Launch NovaWave**
   ```bash
   npm start
   ```

***

**🛠 Technical Stack:** Electron, music-metadata, node-id3, yt-dlp-wrap, electron-store.  
**📦 Version:** 2.5.0  
**👤 Author:** SnuggleDino  
**🕒 Last Updated:** Monday, December 29, 2025
