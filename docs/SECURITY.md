# Security Architecture and Considerations

Atelier operates with standard user permissions while interacting with native Windows shell components, Direct3D 11 hardware acceleration, and the local file system. This document outlines the security boundaries, sandboxing models, and data protection practices implemented across the project.

```mermaid
flowchart TD
    subgraph External ["External & Untrusted Data"]
        Net["Remote Web (Open-Meteo, lrclib.net, Widget APIs)"]
        BillingSites["External Billing Pages (billing-* WebView2)"]
        ScenePkg["User / Steam Workshop Archives (.pkg)"]
        UserFiles["Imported Video & Photo Files"]
    end

    subgraph Sandbox ["WebView2 Sandboxed Security Boundary"]
        MainUI["Studio UI (index.html)"]
        DockUI["Dock, Popups & Tray (dock.html, tray.html)"]
        IslandUI["Dynamic Island (island.html)"]
        WallpaperUI["Wallpaper Host (wallpaper.html)"]
        WidgetUI["Widget Windows (widget.html)"]
        BillingUI["Isolated Billing WebView2 (IPC Blocked)"]
    end

    subgraph Protocols ["Strict Custom URI Protocol Handlers"]
        P1["wallpaper-scene://<br/>(Validates Canonical Paths & Path Traversal)"]
        P2["wallpaper-media://<br/>(Restricted to Whitelisted Media Exts)"]
        P3["widget-photo://<br/>(Sandboxed to widget-photos/ Directory)"]
    end

    subgraph RustBackend ["Trusted Rust Backend (Tauri IPC & Win32)"]
        IPCRouter["Tauri IPC Router (capabilities/default.json)"]
        ASTParser["Safe Expression Parser (No eval / No SceneScript)"]
        NativeAuth["Native Key & OAuth Signer (widget_auth, widget_google, widget_appstore)"]
        ShellManager["Win32 Shell & Local-Only Tray Pipe"]
    end

    Net --> MainUI
    Net --> NativeAuth
    BillingSites --> BillingUI
    ScenePkg --> P1
    UserFiles --> P2
    UserFiles --> P3

    MainUI <--> IPCRouter
    DockUI <--> IPCRouter
    IslandUI <--> IPCRouter
    WallpaperUI <--> IPCRouter
    WidgetUI <--> IPCRouter
    BillingUI -.->|"Rejected by invoke_handler"| IPCRouter

    P1 --> ASTParser
    IPCRouter --> NativeAuth
    IPCRouter --> ShellManager
```

---

## Security Principles & Controls

### 1. File Access & Path Traversal Prevention
- All custom URI schemes (`wallpaper-scene://`, `wallpaper-media://`, `workshop-media://`, `widget-photo://`) sanitize incoming request URIs against directory traversal attacks (`../`, `%2e%2e`, backslash variations).
- Requests containing path traversal sequences or attempts to access root drive directories are rejected with `403 Forbidden` before opening file handles.

---

### 2. Prevention of Arbitrary Code Execution
- **No `eval` Execution**: Wallpaper Engine scenes often contain dynamic conditions to toggle layer variants (e.g. alternate clothing or hair). Atelier parses these conditions using a bounded arithmetic and boolean expression AST evaluator (`crates/ui/src/scene_properties.rs`). Arbitrary JavaScript execution is impossible.
- **SceneScript and Custom Shaders Blocked**: Arbitrary foreign binary shaders and JavaScript SceneScripts embedded inside third-party packages are discarded at import time and never evaluated.

---

### 3. Audio Capture & Privacy Protection
- **Output Loopback Only**: The `atelier-audio` crate explicitly configures WASAPI for render loopback (`eRender, eMultimedia`). It does **not** initialize capture endpoints (`eCapture`) and cannot record the user's microphone.
- **Zero Audio Storage**: Audio samples are processed strictly in a 512-sample circular buffer in volatile RAM and immediately discarded after computing the FFT spectrum. No audio recordings are ever written to disk or transmitted over the network.

---

### 4. Window Capabilities, Billing Isolation & Native Credentials
- **Window Capability Scoping (`capabilities/default.json`)**: Tauri IPC permissions are scoped strictly to trusted application windows (`main`, `tray-panel`, `atelier-menu`, `audio-output-panel`, `installer`, `dynamic-island`, `desktop-dock`, `dock-language`, `widget-*`, `desktop-wallpaper`).
- **Billing WebView2 Isolation (`widget_billing.rs`)**: Any `billing-*` WebView2 window used to inspect prepaid balances is explicitly blocked in `invoke_handler` (`"Billing websites cannot invoke Atelier commands"`).
- **Native Key & Token Handling**: Service-account JSON keys (Google Analytics / Play Store) and App Store `.p8` keys are read and signed natively in Rust (`widget_google.rs`, `widget_appstore.rs`) without exposing private keys to WebViews. Public feed redirects (`widget_auth.rs`) allow up to 5 HTTPS redirects without forwarding authorization headers.
- **Local-Only Tray Named Pipe (`tray_bridge.rs`)**: The `\\.\pipe\atelier_systray_monitor` server configures `reject_remote_clients(true)` and bounds incoming frame/icon dimensions in `tray_protocol.rs`.
- **Terminable Calendar Worker**: ICS/RSS parsing runs inside a dedicated Web Worker with explicit size, time, and 50,000-occurrence limits.

---

### 5. Least Privilege & UAC Elevation
- Atelier does not require Administrator privileges to run. All taskbar composition styling, dock AppBar reservations, and wallpaper injections execute under standard user security tokens.
