use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, Serialize, Deserialize)]
struct Snapshot {
    amount: String,
    currency: String,
    selector: String,
    sampled_at: u64,
}
static STATE: OnceLock<Mutex<HashMap<String, Snapshot>>> = OnceLock::new();
const SAMPLE_PATH: &str = "/__atelier_billing_sample";
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
fn path() -> Result<std::path::PathBuf, String> {
    Ok(super::settings_path()
        .ok_or("Billing data directory unavailable")?
        .with_file_name("billing-snapshots.json"))
}
fn state() -> &'static Mutex<HashMap<String, Snapshot>> {
    STATE.get_or_init(|| {
        let load = || -> Option<HashMap<String, Snapshot>> {
            let file = std::fs::File::open(path().ok()?).ok()?;
            let mut bytes = Vec::new();
            file.take(65537).read_to_end(&mut bytes).ok()?;
            if bytes.len() > 65536 {
                return None;
            }
            serde_json::from_slice(&bytes).ok()
        };
        Mutex::new(
            load()
                .unwrap_or_default()
                .into_iter()
                .filter(|(provider, s)| provider_url(provider).is_ok() && valid_snapshot(s))
                .collect(),
        )
    })
}
fn persist(values: &HashMap<String, Snapshot>) -> Result<(), String> {
    let path = path()?;
    std::fs::create_dir_all(path.parent().ok_or("Invalid billing directory")?)
        .map_err(|_| "Billing directory could not be created")?;
    let bytes = serde_json::to_vec(values).map_err(|_| "Could not encode billing preferences")?;
    let temporary = path.with_extension("json.tmp");
    std::fs::write(&temporary, bytes)
        .and_then(|_| std::fs::rename(temporary, path))
        .map_err(|_| "Billing preferences could not be saved".into())
}
fn provider_url(provider: &str) -> Result<&'static str, String> {
    match provider {
        "openai" => Ok("https://platform.openai.com/settings/organization/billing/overview"),
        "anthropic" => Ok("https://platform.claude.com/settings/billing"),
        "stripe_mrr" => Ok("https://dashboard.stripe.com/billing"),
        _ => Err("Unknown Billing provider".into()),
    }
}
fn trusted_page(provider: &str, url: &url::Url) -> bool {
    url.scheme() == "https"
        && url.port_or_known_default() == Some(443)
        && url.username().is_empty()
        && url.password().is_none()
        && match provider {
            "openai" => {
                url.host_str() == Some("platform.openai.com")
                    && url.path().starts_with("/settings/organization/billing")
            }
            "anthropic" => {
                [Some("platform.claude.com"), Some("console.anthropic.com")]
                    .contains(&url.host_str())
                    && url.path().starts_with("/settings/billing")
            }
            "stripe_mrr" => {
                url.host_str() == Some("dashboard.stripe.com")
                    && url.path().split('/').any(|part| part == "billing")
            }
            _ => false,
        }
}
fn valid_snapshot(value: &Snapshot) -> bool {
    let amount = value.amount.strip_prefix('-').unwrap_or(&value.amount);
    let parts: Vec<_> = amount.split('.').collect();
    value.currency == "USD"
        && parts.len() == 2
        && !parts[0].is_empty()
        && parts[0].len() <= 12
        && parts[1].len() == 2
        && parts
            .iter()
            .all(|part| part.bytes().all(|b| b.is_ascii_digit()))
        && !value.selector.is_empty()
        && value.selector.len() <= 4096
        && !value.selector.chars().any(char::is_control)
        && value.sampled_at > 0
        && value.sampled_at <= 4102444800
}
fn receive(provider: &str, data: &str, nonce: &str) -> Result<(), String> {
    if data.len() > 16384 {
        return Err("Billing sample is too large".into());
    }
    let data: serde_json::Value =
        serde_json::from_str(data).map_err(|_| "Invalid Billing sample")?;
    if data["nonce"] != nonce {
        return Err("Billing sample belongs to a different connection".into());
    }
    let value = Snapshot {
        amount: data["amount"].as_str().unwrap_or("").into(),
        currency: data["currency"].as_str().unwrap_or("").into(),
        selector: data["selector"].as_str().unwrap_or("").into(),
        sampled_at: now(),
    };
    if !valid_snapshot(&value) {
        return Err("Select a single USD amount on the Billing page".into());
    }
    let mut values = state()
        .lock()
        .map_err(|_| "Billing connection unavailable")?;
    values.insert(provider.into(), value);
    persist(&values)
}
fn ensure_window(app: &tauri::AppHandle, provider: &str, visible: bool) -> Result<(), String> {
    let url = provider_url(provider)?;
    let label = format!("billing-{provider}");
    if let Some(window) = app.get_webview_window(&label) {
        if visible {
            window.show().map_err(|_| "Could not show Billing page")?;
            window
                .set_focus()
                .map_err(|_| "Could not focus Billing page")?;
        }
        return Ok(());
    }
    let selector = state()
        .lock()
        .map_err(|_| "Billing connection unavailable")?
        .get(provider)
        .map(|s| s.selector.clone())
        .unwrap_or_default();
    let nonce = format!(
        "{:?}",
        windows::core::GUID::new().map_err(|_| "Could not create a Billing connection token")?
    );
    let config = serde_json::json!({"provider":provider,"selector":selector,"nonce":nonce,"bridgePath":SAMPLE_PATH});
    let script = format!(
        "(()=>{{const config={config};\n{}\n}})();",
        include_str!("../ui/widget-billing-picker.js")
    );
    let provider_owned = provider.to_string();
    let trusted = Arc::new(Mutex::new(false));
    let page_trusted = trusted.clone();
    let page_provider = provider_owned.clone();
    let navigate_provider = provider_owned.clone();
    let title = match provider {
        "openai" => "OpenAI Billing — Atelier",
        "stripe_mrr" => "Stripe MRR — Atelier",
        _ => "Anthropic Billing — Atelier",
    };
    let directory = path()?
        .parent()
        .ok_or("Billing directory unavailable")?
        .join(format!("billing-browser-{provider}"));
    let window = WebviewWindowBuilder::new(
        app,
        &label,
        WebviewUrl::External(url.parse().map_err(|_| "Invalid Billing URL")?),
    )
    .title(title)
    .inner_size(1100.0, 780.0)
    .visible(visible)
    .data_directory(directory)
    .initialization_script(script)
    .on_page_load(move |_, payload| {
        if let Ok(mut trusted) = page_trusted.lock() {
            *trusted = trusted_page(&page_provider, payload.url());
        }
    })
    .on_navigation(move |url| {
        if url.scheme() == "https" && url.path() == SAMPLE_PATH {
            let host_allowed = match navigate_provider.as_str() {
                "openai" => url.host_str() == Some("platform.openai.com"),
                "stripe_mrr" => url.host_str() == Some("dashboard.stripe.com"),
                _ => [Some("platform.claude.com"), Some("console.anthropic.com")]
                    .contains(&url.host_str()),
            };
            if trusted.lock().map(|v| *v).unwrap_or(false) && host_allowed {
                if let Some((_, data)) = url.query_pairs().find(|(key, _)| key == "data") {
                    let _ = receive(&navigate_provider, &data, &nonce);
                }
            }
            return false;
        }
        if let Ok(mut value) = trusted.lock() {
            *value = false;
        }
        url.scheme() == "https" || url.as_str() == "about:blank"
    })
    .build()
    .map_err(|_| "Could not open the Billing sign-in window")?;
    let close_window = window.clone();
    let destroyed = Arc::new(AtomicBool::new(false));
    let close_state = destroyed.clone();
    window.on_window_event(move |event| match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            let _ = close_window.hide();
        }
        tauri::WindowEvent::Destroyed => close_state.store(true, Ordering::Relaxed),
        _ => {}
    });
    let refresh_app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            if destroyed.load(Ordering::Relaxed) {
                break;
            }
            let Some(window) = refresh_app.get_webview_window(&label) else {
                break;
            };
            let selected = state()
                .lock()
                .map(|v| v.contains_key(&provider_owned))
                .unwrap_or(false);
            if selected {
                let _ = window.reload();
            }
        }
    });
    Ok(())
}
async fn open(app: tauri::AppHandle, provider: String, visible: bool) -> Result<(), String> {
    let (sender, receiver) = tokio::sync::oneshot::channel();
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let _ = sender.send(ensure_window(&handle, &provider, visible));
    })
    .map_err(|_| "Billing window unavailable")?;
    receiver
        .await
        .map_err(|_| "Billing window request failed".to_string())?
}
#[tauri::command]
pub async fn widget_billing_open(
    app: tauri::AppHandle,
    window: tauri::Window,
    provider: String,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Billing sign-in is available in widget settings".into());
    }
    provider_url(&provider)?;
    open(app, provider, true).await
}
#[tauri::command]
pub async fn widget_billing_snapshot(
    app: tauri::AppHandle,
    window: tauri::Window,
    provider: String,
) -> Result<serde_json::Value, String> {
    provider_url(&provider)?;
    let expected = match provider.as_str() {
        "openai" => "widget-ai_openai_balance",
        "stripe_mrr" => "widget-rev_stripe_mrr",
        _ => "widget-ai_anthropic_balance",
    };
    if !["main", "desktop-dock", expected].contains(&window.label()) {
        return Err("Billing data unavailable to this window".into());
    }
    let value = state()
        .lock()
        .map_err(|_| "Billing data unavailable")?
        .get(&provider)
        .cloned()
        .ok_or("Connect the Billing page and select the amount to display")?;
    open(app, provider, false).await?;
    Ok(
        serde_json::json!({"amount":value.amount,"currency":value.currency,"sampled_at":value.sampled_at,"stale":now().saturating_sub(value.sampled_at)>180}),
    )
}
#[tauri::command]
pub fn widget_billing_disconnect(
    app: tauri::AppHandle,
    window: tauri::Window,
    provider: String,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Disconnect Billing in widget settings".into());
    }
    provider_url(&provider)?;
    if let Some(window) = app.get_webview_window(&format!("billing-{provider}")) {
        window
            .clear_all_browsing_data()
            .map_err(|_| "Could not clear the Billing browser session")?;
        window
            .destroy()
            .map_err(|_| "Could not close Billing connection")?;
    }
    let mut values = state()
        .lock()
        .map_err(|_| "Billing connection unavailable")?;
    values.remove(&provider);
    persist(&values)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn billing_samples_only_accept_selected_usd_amounts_and_known_pages() {
        let mut value = Snapshot {
            amount: "1234.56".into(),
            currency: "USD".into(),
            selector: "#balance".into(),
            sampled_at: 1800000000,
        };
        assert!(valid_snapshot(&value));
        for amount in [
            "NaN",
            "1e3",
            "123.456",
            "12",
            "1,234.56",
            "1234567890123.00",
        ] {
            value.amount = amount.into();
            assert!(!valid_snapshot(&value));
        }
        assert!(trusted_page(
            "openai",
            &url::Url::parse("https://platform.openai.com/settings/organization/billing/overview")
                .unwrap()
        ));
        for url in [
            "https://platform.openai.com.evil/settings/organization/billing",
            "https://platform.openai.com/settings/organization/members",
            "http://platform.openai.com/settings/organization/billing",
        ] {
            assert!(!trusted_page("openai", &url::Url::parse(url).unwrap()));
        }
        assert!(provider_url("other").is_err());
        assert!(receive("openai", "{}", "expected").is_err());
    }
}
