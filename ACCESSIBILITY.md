# Accessibility Statement for Atelier

Atelier is committed to providing a customizable, performant, and accessible desktop environment for all users, including individuals with disabilities or specific access needs.

## Our Commitment

We strive to ensure that Atelier's user interface, desktop integrations, and documentation adhere to modern accessibility best practices and guidelines, including the Web Content Accessibility Guidelines ([WCAG 2.1](https://www.w3.org/TR/WCAG21/)) Level AA where applicable for web-rendered surfaces.

Key areas of focus include:
- **Perceivable UI**: Clear color contrast ratios, legible typography, and support for high-DPI scaling across single and multi-monitor setups.
- **Operable Navigation**: Full keyboard navigability throughout the Studio interface, logical tab ordering, and visible focus indicators.
- **Motion & Visual Sensitivity**: Settings to toggle or reduce physics-based window animations, particle effects, and live wallpaper motion for users sensitive to motion or flashing elements.
- **Screen Reader Compatibility**: Semantic HTML and ARIA labels within the WebView2-based Studio interface, ensuring compatibility with Windows Narrator and popular screen readers.

## Supported Environments & Assistive Technologies

Atelier targets Windows 10 and Windows 11 and aims to work seamlessly alongside native Windows accessibility features:
- **Windows High Contrast / Contrast Themes**: Studio interfaces and widgets aim to adapt to system high contrast modes.
- **Display Scaling & Text Size**: Complete support for Windows per-monitor DPI scaling and custom text sizing.
- **Keyboard Navigation**: Standard navigation keys (`Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys) and customizable hotkeys.
- **Screen Readers**: Verified compatibility with Windows Narrator, NVDA, and JAWS for web-based UI views.

## Known Limitations & Ongoing Improvements

While we work actively to improve accessibility across all modules, some areas may currently have limitations:
- **Direct3D Wallpapers & Visualizers**: Real-time shader effects and audio visualizers do not provide audio descriptions or screen reader feedback by nature of background wallpaper rendering.
- **Dynamic Island & Desktop Widgets**: Certain custom floating widgets may require additional keyboard navigation shortcuts which are actively being expanded.
- **Third-party Themes**: Custom community presets may alter contrast ratios; users can always reset to default accessible themes.

## Reporting Accessibility Issues & Feedback

We welcome feedback on the accessibility of Atelier. If you encounter any barriers, difficulty using assistive technology, or have suggestions for improvements:

1. **Open an Issue**: Submit a report on [GitHub Issues](https://github.com/polichdev/atelier/issues/new/choose) with the `accessibility` label.
2. **Provide Details**: Please include your Windows version, any assistive technology in use (e.g., screen reader brand and version), and the specific barrier encountered.

We review accessibility reports with high priority and are dedicated to making desktop customization open and accessible to everyone.
