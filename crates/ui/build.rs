fn main() {
    println!("cargo:rerun-if-changed=native/tray_bridge.cpp");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let out = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
        let compiler = cc::Build::new().cpp(true).get_compiler();
        let status = compiler
            .to_command()
            .args([
                "/nologo",
                "/LD",
                "/MT",
                "/O2",
                "/EHsc",
                "/std:c++20",
                "/DUNICODE",
                "/D_UNICODE",
            ])
            .arg("native/tray_bridge.cpp")
            .arg(format!("/Fo{}", out.join("tray_bridge.obj").display()))
            .arg("/link")
            .arg(format!(
                "/OUT:{}",
                out.join("atelier_tray_bridge.dll").display()
            ))
            .arg(format!(
                "/IMPLIB:{}",
                out.join("atelier_tray_bridge.lib").display()
            ))
            .args(["user32.lib", "gdi32.lib"])
            .status()
            .expect("Could not run tray bridge compiler");
        assert!(status.success(), "Could not build tray bridge");
    }
    println!("cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'");
    tauri_build::build();
}
