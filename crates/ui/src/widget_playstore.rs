use std::collections::BTreeMap;
fn aggregate(report: &str, package: &str) -> Result<serde_json::Value, String> {
    let mut reader = csv::Reader::from_reader(report.trim_start_matches('\u{feff}').as_bytes());
    let h = reader.headers().map_err(|_| "Invalid Play report")?.clone();
    let col = |name: &str| {
        h.iter()
            .position(|v| v == name)
            .ok_or_else(|| format!("Missing Play report column: {name}"))
    };
    let date = col("Date")?;
    let pkg = col("Package Name")?;
    let installs = col("Daily Device Installs")?;
    let active = col("Installs on active devices")?;
    let mut days = BTreeMap::<String, (u64, u64)>::new();
    for row in reader.records() {
        let row = row.map_err(|_| "Invalid Play report row")?;
        if row.get(pkg) != Some(package) {
            continue;
        }
        let d = row.get(date).ok_or("Missing date")?;
        if d.len() != 10
            || !d.bytes().enumerate().all(|(i, b)| {
                if i == 4 || i == 7 {
                    b == b'-'
                } else {
                    b.is_ascii_digit()
                }
            })
        {
            return Err("Invalid report date".into());
        }
        let number = |column| {
            row.get(column)
                .ok_or("Missing report number")?
                .parse::<u64>()
                .map_err(|_| "Invalid report number")
        };
        let a = number(installs)?;
        let b = number(active)?;
        let total = days.entry(d.to_string()).or_default();
        total.0 = total.0.checked_add(a).ok_or("Install total overflow")?;
        total.1 = total.1.checked_add(b).ok_or("Device total overflow")?;
    }
    let (date, (installs, active)) = days
        .last_key_value()
        .ok_or("No data for this package in the report")?;
    Ok(serde_json::json!({"date":date,"installs":installs,"active":active}))
}
#[tauri::command]
pub async fn widget_play_report(
    window: tauri::Window,
    key_path: String,
    bucket: String,
    package: String,
    month: String,
) -> Result<serde_json::Value, String> {
    if !["main", "desktop-dock", "widget-rev_playstore"].contains(&window.label()) {
        return Err("Play reports unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        if package.is_empty()
            || package.len() > 150
            || !package
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'_')
            || month.len() != 6
            || !month.bytes().all(|b| b.is_ascii_digit())
        {
            return Err("Invalid package name or report month YYYYMM".into());
        }
        let token = super::widget_google::service_token(
            &key_path,
            "https://www.googleapis.com/auth/devstorage.read_only",
        )?;
        let location = format!("{bucket},stats/installs/installs_{package}_{month}_country.csv");
        let report = super::widget_auth::request("play_report", &token, Some(&location), true)?
            .and_then(|v| v.as_str().map(str::to_owned))
            .ok_or("Google returned no report")?;
        aggregate(&report, &package)
    })
    .await
    .map_err(|_| "Play report request failed".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn latest_date_is_summed_by_country_without_mixing_apps() {
        let csv="Date,Package Name,Country,Daily Device Installs,Installs on active devices\n2026-11-01,com.app,US,2,10\n2026-11-02,com.app,US,3,11\n2026-11-02,com.app,GB,4,12\n2026-11-03,com.other,US,999,999\n";
        let r = aggregate(csv, "com.app").unwrap();
        assert_eq!(r["date"], "2026-11-02");
        assert_eq!(r["installs"], 7);
        assert_eq!(r["active"], 23);
        assert!(aggregate(csv, "absent").is_err());
    }
}
