# System Architecture and Data Flow

Atelier is an advanced Windows-focused desktop personalization engine built on a high-performance modular Cargo workspace. The primary user-facing process is the `Atelier` Tauri 2.0 application (`atelier-ui`).

```mermaid
flowchart TB
    subgraph FrontendLayer ["Presentation Layer (Tauri 2.0 & WebView2)"]
        Studio["Studio Shell (index.html)<br/>Settings & Visual Designers"]
        Dock["Desktop Dock (dock.html)<br/>Floating AppBar, Folders & Capsules"]
        Island["Dynamic Island (island.html)<br/>Multi-Page Panel & Synced Lyrics"]
        Popups["Dock & Tray Popups<br/>(tray, atelier-menu, audio-output-panel, dock-language)"]
        Widgets["Overlay Widgets (widget.html)<br/>Movable Overlays & Isolated billing-*"]
        WallpaperHost["Wallpaper Host (wallpaper.html)<br/>Video & 2D Scene WebGL Player"]
    end

    subgraph StateLayer ["Application State Management (atelier-ui)"]
        AppState["AppState & TrayBridge<br/>(Taskbar, Audio, Core Mutex, Tray Pipe)"]
        DockState["DockState<br/>(Pins, Running Windows, Glass, AppBar)"]
        IslandState["IslandState<br/>(Pages, Grid Layout, Lyrics, Audio)"]
        WallState["Wallpapers<br/>(Profiles, Playback Rules)"]
        WidgetState["Widgets & Providers<br/>(109 Kinds, Auth, Timers, Billing, Docker)"]
    end

    subgraph Subsystems ["Engine Subsystems"]
        TaskbarEngine["atelier-taskbar<br/>(DWM Accents & XAML Bridge)"]
        TrayEngine["Native C++20 Tray Bridge<br/>(atelier_tray_bridge.dll)"]
        WallpaperEngine["atelier-wallpaper<br/>(WorkerW, D3D11, PKG Decoders)"]
        AudioEngine["atelier-audio<br/>(WASAPI Capture & FFT Analyzer)"]
        WidgetEngine["atelier-widget<br/>(PDH Hardware Metrics & SMTC)"]
    end

    subgraph OSIntegration ["Windows Operating System"]
        Explorer["Windows Explorer (Shell_TrayWnd & Progman)"]
        DWM["Desktop Window Manager (Composition & Acrylic)"]
        AudioDev["Audio Endpoints (WASAPI & PolicyConfig COM)"]
        Metrics["Windows Kernel (PDH / DXGI / SystemPower)"]
    end

    Studio <--> AppState
    Dock <--> DockState
    Popups <--> DockState
    Popups <--> AppState
    Island <--> IslandState
    Widgets <--> WidgetState
    WallpaperHost <--> WallState

    AppState --> TaskbarEngine
    AppState --> TrayEngine
    DockState --> TaskbarEngine
    WallState --> WallpaperEngine
    WidgetState --> WidgetEngine
    IslandState --> WidgetEngine
    AppState --> AudioEngine
    DockState --> AudioEngine
    IslandState --> AudioEngine
    WallState --> AudioEngine

    TaskbarEngine --> Explorer
    TaskbarEngine --> DWM
    TrayEngine --> Explorer
    WallpaperEngine --> Explorer
    AudioEngine --> AudioDev
    WidgetState --> AudioDev
    WidgetEngine --> Metrics
```

---

## Application Startup and Shutdown Flow

```mermaid
sequenceDiagram
    autonumber
    participant Main as main.rs
    participant App as lib.rs (Tauri Builder)
    participant Dock as desktop_dock
    participant Wall as desktop_wallpaper
    participant Watch as Watchdog Process
    participant Win as Windows Explorer

    Main->>App: Parse CLI flags (Normal vs Watchdog mode)
    App->>App: Register custom URI protocols (wallpaper-media, wallpaper-scene)
    App->>Dock: Initialize DockState & verify saved configuration
    alt Dock is Enabled in Saved Settings
        Dock->>Watch: Spawn detached --dock-watchdog guardian
        Dock->>Win: Register AppBar & hide native taskbars
        Dock->>App: Open desktop-dock window
    end
    App->>Wall: Restore active wallpaper into WorkerW
    App->>App: Spawn background idle audio watcher
    App->>App: Open Mica Studio main window & Tray icon

    Note over Main,Win: Application Running (User Interactive)

    opt Graceful Application Exit
        App->>Dock: dock_state.shutdown() (Deregister AppBar & restore taskbars)
        App->>Wall: desktop_background::shutdown() (Restore stock wallpaper)
        App->>Watch: Signal clean exit
        App->>Main: Exit cleanly (0)
    end
```

---

## Subsystem Interaction Paths

### 1. Taskbar Styling Path
1. UI actions dispatch Tauri commands (`set_taskbar_style`, `reset_desktop_dock`).
2. `TaskbarManager` resolves target `HWND` handles for `Shell_TrayWnd` across all connected displays.
3. Invokes `SetWindowCompositionAttribute` for DWM acrylic/blur and loads `atelier_xaml.dll` on Windows 11 to modify modern visual tree elements safely.
4. `recovery.rs` registers for `TaskbarCreated` to guarantee automatic recovery if Explorer restarts.

---

### 2. Live Wallpaper Path
1. The user selects a video or scene wallpaper in Studio.
2. `desktop_wallpaper.rs` invokes `acquire_workerw()` to locate the desktop background window layer beneath desktop icons.
3. Sets the wallpaper WebView window parent to `WorkerW` using `SetParent`.
4. The WebView loads assets via `wallpaper-media://` (HTTP range streaming) or `wallpaper-scene://` (on-the-fly PKG archive decompression).
5. `wallpaper_performance.rs` monitors fullscreen window events and battery power to pause rendering when appropriate.

---

### 3. Audio Reactivity Path
1. When the desktop visualizer, dock glow, Dynamic Island glow, or wallpaper pulse is active, the consumer calls `request_spectrum()`.
2. `atelier-audio` initializes a WASAPI loopback capture thread on the default audio endpoint.
3. Samples pass through a Hanning window and Radix-2 FFT, mapping 512 frequency samples into 64 musical logarithmic bands.
4. If all consumers are closed or silent for 3 consecutive seconds, the worker thread automatically suspends (0% CPU).

---

### 4. Dynamic Island & Widget Integrations Path
1. **Dynamic Island (`desktop_island.rs`)**: Studio's visual designer (`studio-island.js`) saves multi-page freeform layouts to `island.json`; the `dynamic-island` window (`island.html`) switches between compact pill/notch and expanded tabbed views, polling SMTC media, `lrclib.net` synchronized lyrics (`island_lyrics`), weather, and system metrics while hiding on fullscreen or maximized apps.
2. **Widgets & Dock Capsules (`desktop_widgets.rs`, `widget_*.rs`)**: 107 catalog entries render either in standalone `widget-*` desktop windows or embedded `.dock-capsule` iframes inside `dock.html`, backed by native Rust providers (`widget_auth.rs`, `widget_codex.rs`, `widget_docker.rs`, `widget_audio_outputs.rs`, `widget_timers.rs`, `widget_billing.rs`) and an ICAL.js Web Worker.
