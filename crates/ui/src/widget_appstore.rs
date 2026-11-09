use jsonwebtoken::{Algorithm, EncodingKey, Header};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

fn fixed2(s: &str) -> Result<i128, String> {
    let s = s.trim();
    let negative = s.starts_with('-');
    let s = s.strip_prefix('-').unwrap_or(s);
    let mut parts = s.split('.');
    let whole = parts.next().unwrap_or("");
    let fraction = parts.next().unwrap_or("");
    if parts.next().is_some()
        || whole.len() > 18
        || fraction.len() > 2
        || (whole.is_empty() && fraction.is_empty())
        || !whole.bytes().all(|b| b.is_ascii_digit())
        || !fraction.bytes().all(|b| b.is_ascii_digit())
    {
        return Err("Invalid decimal in Apple report".into());
    }
    let w = if whole.is_empty() {
        0
    } else {
        whole.parse::<i128>().map_err(|_| "Invalid report number")?
    };
    let f = if fraction.is_empty() {
        0
    } else {
        fraction
            .parse::<i128>()
            .map_err(|_| "Invalid report number")?
    } * if fraction.len() == 1 { 10 } else { 1 };
    Ok((w * 100 + f) * if negative { -1 } else { 1 })
}
fn decimal(value: i128, scale: u32) -> String {
    let base = 10i128.pow(scale);
    let sign = if value < 0 { "-" } else { "" };
    let v = value.abs();
    format!(
        "{sign}{}.{:0width$}",
        v / base,
        v % base,
        width = scale as usize
    )
}
fn aggregate(report: &str, sku: &str) -> Result<serde_json::Value, String> {
    let mut reader = csv::ReaderBuilder::new()
        .delimiter(b'\t')
        .from_reader(report.trim_start_matches('\u{feff}').as_bytes());
    let headers = reader
        .headers()
        .map_err(|_| "Invalid Apple report headers")?
        .clone();
    let column = |name: &str| {
        headers
            .iter()
            .position(|h| h == name)
            .ok_or_else(|| format!("Report column missing: {name}"))
    };
    let units = column("Units")?;
    let proceeds = column("Developer Proceeds")?;
    let currency = column("Currency of Proceeds")?;
    let sku_col = column("SKU")?;
    let mut total_units = 0i128;
    let mut totals = BTreeMap::<String, i128>::new();
    let mut rows = 0;
    for row in reader.records() {
        let row = row.map_err(|_| "Invalid Apple report row")?;
        if !sku.is_empty() && row.get(sku_col) != Some(sku) {
            continue;
        }
        let u = fixed2(row.get(units).ok_or("Report units missing")?)?;
        let p = fixed2(row.get(proceeds).ok_or("Report proceeds missing")?)?;
        let c = row
            .get(currency)
            .ok_or("Report currency missing")?
            .to_ascii_uppercase();
        if c.len() != 3 || !c.bytes().all(|b| b.is_ascii_uppercase()) {
            return Err("Invalid report currency".into());
        }
        total_units = total_units.checked_add(u).ok_or("Units overflow")?;
        let amount = u.checked_mul(p).ok_or("Proceeds overflow")?;
        let sum = totals.entry(c).or_default();
        *sum = sum.checked_add(amount).ok_or("Proceeds overflow")?;
        rows += 1;
    }
    Ok(
        serde_json::json!({"units":decimal(total_units,2),"rows":rows,"proceeds":totals.into_iter().map(|(currency,value)|serde_json::json!({"currency":currency,"amount":decimal(value,4)})).collect::<Vec<_>>()}),
    )
}
#[tauri::command]
pub async fn widget_appstore_sales(
    window: tauri::Window,
    issuer_id: String,
    key_id: String,
    key_path: String,
    vendor: String,
    report_date: String,
    sku: String,
) -> Result<serde_json::Value, String> {
    if !["main", "desktop-dock", "widget-rev_appstore"].contains(&window.label()) {
        return Err("App Store reports unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        if issuer_id.len() != 36
            || !issuer_id
                .bytes()
                .all(|b| b.is_ascii_hexdigit() || b == b'-')
            || key_id.is_empty()
            || key_id.len() > 32
            || !key_id.bytes().all(|b| b.is_ascii_alphanumeric())
        {
            return Err("Invalid App Store issuer or key ID".into());
        }
        let path = std::path::Path::new(&key_path);
        if !path.is_absolute() || path.extension().and_then(|v| v.to_str()) != Some("p8") {
            return Err("Select an absolute .p8 signing-key path".into());
        }
        let metadata = std::fs::metadata(path).map_err(|_| "Signing key could not be opened")?;
        if !metadata.is_file() || metadata.len() > 16384 {
            return Err("Invalid signing-key file".into());
        }
        use std::io::Read;
        let mut pem = Vec::new();
        std::fs::File::open(path)
            .map_err(|_| "Signing key could not be opened")?
            .take(16385)
            .read_to_end(&mut pem)
            .map_err(|_| "Signing key could not be read")?;
        if pem.len() > 16384 {
            return Err("Signing key is too large".into());
        }
        let key = EncodingKey::from_ec_pem(&pem).map_err(|_| "Invalid ES256 signing key")?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| "System clock unavailable")?
            .as_secs();
        let mut header = Header::new(Algorithm::ES256);
        header.kid = Some(key_id);
        let claims =
            serde_json::json!({"iss":issuer_id,"iat":now,"exp":now+120,"aud":"appstoreconnect-v1"});
        let jwt = jsonwebtoken::encode(&header, &claims, &key)
            .map_err(|_| "Could not sign App Store request")?;
        let report = super::widget_auth::request(
            "appstore_sales",
            &jwt,
            Some(&format!("{vendor},{report_date}")),
            true,
        )?
        .and_then(|v| v.as_str().map(str::to_owned))
        .ok_or("Apple returned no report")?;
        let mut result = aggregate(&report, &sku)?;
        result["date"] = report_date.into();
        Ok(result)
    })
    .await
    .map_err(|_| "App Store request failed".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_report_totals_include_returns_and_filter_sku() {
        let report="SKU\tUnits\tDeveloper Proceeds\tCurrency of Proceeds\na\t100\t.70\tUSD\na\t-2\t.70\tUSD\nb\t1\t2.10\tGBP\n";
        let r = aggregate(report, "a").unwrap();
        assert_eq!(r["units"], "98.00");
        assert_eq!(r["proceeds"][0]["amount"], "68.6000");
        assert_eq!(r["rows"], 2);
        assert!(fixed2("1.234").is_err());
    }
}
