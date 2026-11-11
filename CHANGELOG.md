# Changelog

Notable changes are recorded here. Entries describe the current development tree; they do not imply a published release.

## 0.2.0 / Unreleased

- Added Studio controls for Windows taskbar appearance and presets, plus System Appearance (Mica/Acrylic/Glass backdrops, active/inactive opacity, corners, borders) and System Animations (Spring/Snappy/Ease Out/Linear window transitions, dock bounce, hover wave) with an interactive File Explorer preview stage in Studio.
- Added a separate Custom Taskbar dock with pinned apps, visibility and order controls, custom icons, style presets (Black, White, Liquid Glass, iOS, Midnight), WinRT host-backdrop glass, full-width mode, embedded widget capsules, app folder flyouts, pointer drag-and-drop reordering, fullscreen hiding, a maximized-window gap, and recovery watchdogs.
- Added a C++20 native tray bridge (`atelier_tray_bridge.dll`) and HTML hidden tray icon popup (`tray.html`), a custom HTML Atelier tray context menu (`atelier-menu.html`), an input language switcher popup, and a native Windows audio output switcher popup (`audio-output-panel.html`).
- Added a multi-page Dynamic Island (`dynamic-island`) with an interactive Studio visual grid designer, up to 6 customizable tabbed pages, `lrclib.net` synchronized lyrics, notch/pill/rounded/square shapes, quick notes, weather, hardware telemetry, and fullscreen/maximized hiding.
- Added a Windows 11 XAML bridge and recovery paths for taskbar appearance and positioning.
- Added Studio window styling, packaging assets, redesigned interactive website (`website/`), and development/test scripts.
- Added local MP4/WebM and partial 2D scene playback, per-wallpaper and global playback controls, and import of supported Workshop items already downloaded by Steam.
- Expanded desktop and dock widgets to 107 catalog entries across 8 categories (AI quotas including Codex CLI, Revenue & SaaS, Dev Life & Docker, Crypto & Stocks, Productivity timers/stopwatch/screen time/clipboard/ICAL.js calendar, System & Quick Controls, Media & Feeds), plus isolated billing page capture (`billing-*` WebView2).
- Added local audio loopback capture (`atelier-audio`), 64-band FFT visualizer (with ultra-wide 4K support), and recovery for the desktop background.
