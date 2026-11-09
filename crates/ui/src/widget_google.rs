use jsonwebtoken::{Algorithm, EncodingKey, Header};
use std::io::Read;
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn service_token(key_path: &str, scope: &str) -> Result<String, String> {
    if ![
        "https://www.googleapis.com/auth/devstorage.read_only",
        "https://www.googleapis.com/auth/analytics.readonly",
    ]
    .contains(&scope)
    {
        return Err("Unsupported Google permission scope".into());
    }
    let path = std::path::Path::new(key_path);
    if !path.is_absolute() || path.extension().and_then(|p| p.to_str()) != Some("json") {
        return Err("Enter an absolute service-account JSON key path".into());
    }
    let file = std::fs::File::open(path).map_err(|_| "Service-account key could not be opened")?;
    if !file.metadata().map_err(|_| "Invalid key file")?.is_file() {
        return Err("Invalid service-account key file".into());
    }
    let mut bytes = Vec::new();
    file.take(65537)
        .read_to_end(&mut bytes)
        .map_err(|_| "Key could not be read")?;
    if bytes.len() > 65536 {
        return Err("Key file is too large".into());
    }
    let data: serde_json::Value =
        serde_json::from_slice(&bytes).map_err(|_| "Invalid service-account JSON")?;
    if data["type"] != "service_account" {
        return Err("A service-account key is required".into());
    }
    let email = data["client_email"]
        .as_str()
        .filter(|v| v.len() <= 320 && v.contains('@'))
        .ok_or("Service-account email missing")?;
    let pem = data["private_key"].as_str().ok_or("Private key missing")?;
    let key = EncodingKey::from_rsa_pem(pem.as_bytes()).map_err(|_| "Invalid RSA signing key")?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "System clock unavailable")?
        .as_secs();
    let claims = serde_json::json!({"iss":email,"scope":scope,"aud":"https://oauth2.googleapis.com/token","iat":now,"exp":now+600});
    let assertion = jsonwebtoken::encode(&Header::new(Algorithm::RS256), &claims, &key)
        .map_err(|_| "Could not sign Google token")?;
    super::widget_auth::request("google_service_token", &assertion, None, true)?
        .and_then(|v| v["access_token"].as_str().map(str::to_owned))
        .ok_or("Google did not issue an access token".into())
}

#[tauri::command]
pub async fn widget_ga4_service_report(
    window: tauri::Window,
    key_path: String,
    property: String,
) -> Result<serde_json::Value, String> {
    if !["main", "desktop-dock", "widget-rev_google_analytics"].contains(&window.label()) {
        return Err("Analytics unavailable to this window".into());
    }
    if property.is_empty() || property.len() > 20 || !property.bytes().all(|v| v.is_ascii_digit()) {
        return Err("Set a numeric GA4 property ID".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let token = service_token(
            &key_path,
            "https://www.googleapis.com/auth/analytics.readonly",
        )?;
        super::widget_auth::request("ga4", &token, Some(&property), true)?
            .ok_or("Google returned no analytics report".into())
    })
    .await
    .map_err(|_| "Analytics request failed".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_accepts_supported_read_scopes_and_absolute_key_paths() {
        assert!(service_token(
            "anything.json",
            "https://www.googleapis.com/auth/cloud-platform"
        )
        .is_err());
        assert!(service_token(
            "relative.json",
            "https://www.googleapis.com/auth/analytics.readonly"
        )
        .is_err());
        assert!(service_token(
            "C:/keys/key.p8",
            "https://www.googleapis.com/auth/analytics.readonly"
        )
        .is_err());
    }
}
