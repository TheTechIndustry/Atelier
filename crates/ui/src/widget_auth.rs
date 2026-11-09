use base64::{engine::general_purpose::STANDARD, Engine};
use std::ffi::c_void;
use std::ptr;
use std::time::{Duration, Instant};
use windows::core::{w, PCWSTR};
use windows::Win32::Networking::WinHttp::{
    WinHttpCloseHandle, WinHttpConnect, WinHttpOpen, WinHttpOpenRequest, WinHttpQueryHeaders,
    WinHttpReadData, WinHttpReceiveResponse, WinHttpSendRequest, WinHttpSetOption,
    WinHttpSetTimeouts, INTERNET_DEFAULT_HTTPS_PORT, WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
    WINHTTP_DISABLE_REDIRECTS, WINHTTP_FLAG_SECURE, WINHTTP_OPTION_DISABLE_FEATURE,
    WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_QUERY_LOCATION, WINHTTP_QUERY_STATUS_CODE,
};

struct InternetHandle(*mut c_void);
impl Drop for InternetHandle {
    fn drop(&mut self) {
        unsafe {
            let _ = WinHttpCloseHandle(self.0);
        }
    }
}

pub(crate) fn request(
    provider: &str,
    secret: &str,
    resource: Option<&str>,
    read_json: bool,
) -> Result<Option<serde_json::Value>, String> {
    request_inner(provider, secret, resource, read_json, 0, Instant::now())
}
fn redirect_target(current: &str, location: &str, hops: u8) -> Result<String, String> {
    if hops >= 5
        || location.is_empty()
        || location.len() > 4096
        || location.chars().any(char::is_control)
    {
        return Err("Feed redirect limit exceeded or invalid redirect".into());
    }
    let mut target = url::Url::parse(current)
        .and_then(|base| base.join(location))
        .map_err(|_| "Invalid feed redirect")?;
    if target.scheme() != "https"
        || !target.username().is_empty()
        || target.password().is_some()
        || target.host_str().is_none()
    {
        return Err("Feed redirects must use HTTPS without embedded credentials".into());
    }
    target.set_fragment(None);
    Ok(target.to_string())
}
fn request_inner(
    provider: &str,
    secret: &str,
    resource: Option<&str>,
    read_json: bool,
    hops: u8,
    started: Instant,
) -> Result<Option<serde_json::Value>, String> {
    if started.elapsed() > Duration::from_secs(25) {
        return Err("Service request timed out".into());
    }
    if secret.is_empty()
        || secret.len()
            > if provider == "perplexity_credits" {
                16384
            } else {
                4096
            }
        || !secret.bytes().all(|c| (0x21..=0x7e).contains(&c))
    {
        return Err("Invalid credential format".into());
    }
    let vercel_path;
    let feed_url;
    let feed_path;
    let gitlab_host;
    let gitlab_path;
    let market_path;
    let stripe_charges_path;
    let stripe_subscriptions_path;
    let xai_path;
    let lemon_path;
    let datafast_path;
    let polar_path;
    let shopify_host;
    let ga4_path;
    let metals_path;
    let index_path;
    let appstore_path;
    let play_path;
    let copilot_path;
    let opencode_path;
    let ai_cost_path;
    let revenue_path;
    let mut secure = true;
    let mut post_body: Option<Vec<u8>> = None;
    let mut port = INTERNET_DEFAULT_HTTPS_PORT;
    let (host, path, header) = match provider {
        "perplexity_credits" => (
            "www.perplexity.ai",
            "/rest/billing/credits?version=2.18&source=default",
            format!("{}Origin: https://www.perplexity.ai\r\nReferer: https://www.perplexity.ai/account/usage\r\n",perplexity_cookie(resource.unwrap_or("__Secure-next-auth.session-token"),secret)?),
        ),
        "paddle_metrics" => {
            let (host,path)=paddle_metric_target(resource.unwrap_or(""))?;revenue_path=path;
            (host,revenue_path.as_str(),format!("Authorization: Bearer {secret}\r\nPaddle-Version: 1\r\n"))
        }
        "dodo_payments" => {
            let (host,path)=dodo_payments_target(resource.unwrap_or(""))?;revenue_path=path;
            (host,revenue_path.as_str(),format!("Authorization: Bearer {secret}\r\n"))
        }
        "shopify_orders" => {
            let value:serde_json::Value=serde_json::from_str(resource.unwrap_or("")).map_err(|_| "Invalid Shopify report settings")?;
            let (start,end)=revenue_range(&value)?;
            let (host,_)=shopify_target(&format!("{},{}",value["shop"].as_str().unwrap_or(""),start))?;shopify_host=host;
            let after=value.get("after").and_then(|v| v.as_str()).unwrap_or("");
            if after.len()>2048 || !after.bytes().all(|v| (0x21..=0x7e).contains(&v)){return Err("Invalid Shopify page cursor".into());}
            let query="query WidgetOrders($filter: String!, $after: String) { orders(first: 100, after: $after, sortKey: CREATED_AT, query: $filter) { nodes { id test cancelledAt displayFulfillmentStatus currentTotalPriceSet { shopMoney { amount currencyCode } } netPaymentSet { shopMoney { amount currencyCode } } } pageInfo { hasNextPage endCursor } } }";
            post_body=Some(serde_json::to_vec(&serde_json::json!({"query":query,"variables":{"filter":format!("created_at:>='{start}' created_at:<='{end}' test:false"),"after":if after.is_empty(){None}else{Some(after)}}})).map_err(|_| "Invalid Shopify report query")?);
            (shopify_host.as_str(),"/admin/api/2026-10/graphql.json",format!("X-Shopify-Access-Token: {secret}\r\nContent-Type: application/json\r\n"))
        }
        "glm_quota" => {
            let host = match resource.unwrap_or("Z.ai") {
                "Z.ai" => "api.z.ai",
                "BigModel" => "open.bigmodel.cn",
                _ => return Err("Select Z.ai or BigModel".into()),
            };
            (
                host,
                "/api/monitor/usage/quota/limit",
                format!("Authorization: {secret}\r\nAccept-Language: en-US,en\r\n"),
            )
        }
        "openai_costs" | "anthropic_costs" => {
            ai_cost_path = ai_cost_target(provider, resource.unwrap_or(""))?;
            if provider == "openai_costs" {
                (
                    "api.openai.com",
                    ai_cost_path.as_str(),
                    format!("Authorization: Bearer {secret}\r\n"),
                )
            } else {
                ("api.anthropic.com", ai_cost_path.as_str(), format!("x-api-key: {secret}\r\nanthropic-version: 2026-10-21\r\nanthropic-beta: analytics-usage-cost-2026-08-24\r\n"))
            }
        }
        "public_feed" => {
            feed_url = url::Url::parse(secret).map_err(|_| "Invalid feed URL")?;
            if feed_url.scheme() != "https"
                || !feed_url.username().is_empty()
                || feed_url.password().is_some()
            {
                return Err("Feed URL must use HTTPS without embedded credentials".into());
            }
            let host = feed_url.host_str().ok_or("Feed URL has no host")?;
            port = feed_url
                .port_or_known_default()
                .ok_or("Invalid feed port")?;
            feed_path = match feed_url.query() {
                Some(query) => format!("{}?{query}", feed_url.path()),
                None => feed_url.path().to_owned(),
            };
            (host, feed_path.as_str(), String::new())
        }
        "gitlab" => {
            let (host, endpoint, target_port) = gitlab_target(resource.unwrap_or("gitlab.com"))?;
            gitlab_host = host;
            gitlab_path = endpoint;
            port = target_port;
            (
                gitlab_host.as_str(),
                gitlab_path.as_str(),
                format!("PRIVATE-TOKEN: {secret}\r\n"),
            )
        }
        "alphavantage" => {
            if !secret.bytes().all(|c| c.is_ascii_alphanumeric()) {
                return Err("Invalid Alpha Vantage API key".into());
            }
            let symbol = resource.unwrap_or("IBM");
            if symbol.is_empty()
                || symbol.len() > 20
                || !symbol
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'.' || c == b'-')
            {
                return Err("Invalid market symbol".into());
            }
            market_path = format!("/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={secret}");
            ("www.alphavantage.co", market_path.as_str(), String::new())
        }
        "xai_management" => {
            let team = resource.unwrap_or("");
            if team.is_empty()
                || team.len() > 128
                || !team
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
            {
                return Err("Enter a valid xAI team ID".into());
            }
            xai_path = format!("/v1/billing/teams/{team}/prepaid/balance");
            (
                "management-api.x.ai",
                xai_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "lemonsqueezy" => {
            let store = resource.unwrap_or("");
            if store.is_empty() || store.len() > 20 || !store.bytes().all(|c| c.is_ascii_digit()) {
                return Err("Enter a numeric Lemon Squeezy store ID".into());
            }
            lemon_path = format!("/v1/orders?filter%5Bstore_id%5D={store}&page%5Bsize%5D=1");
            (
                "api.lemonsqueezy.com",
                lemon_path.as_str(),
                format!("Authorization: Bearer {secret}\r\nAccept: application/vnd.api+json\r\n"),
            )
        }
        "datafast" => {
            let website = resource.unwrap_or("");
            if secret.starts_with("dft_")
                && (website.is_empty()
                    || website.len() > 128
                    || !website
                        .bytes()
                        .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_'))
            {
                return Err("Enter a valid DataFast website ID".into());
            }
            if !secret.starts_with("dft_") && !secret.starts_with("df_") {
                return Err("Enter a DataFast website key or account token".into());
            }
            datafast_path = if secret.starts_with("dft_") {
                format!("/api/v1/analytics/realtime?websiteId={website}")
            } else {
                "/api/v1/analytics/realtime".into()
            };
            (
                "datafa.st",
                datafast_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "polar" => {
            polar_path = polar_metrics_target(resource.unwrap_or(""))?;
            (
                "api.polar.sh",
                polar_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "paddle" => {
            let host = match resource.unwrap_or("live") {
                "live" => "api.paddle.com",
                "sandbox" => "sandbox-api.paddle.com",
                _ => return Err("Invalid Paddle environment".into()),
            };
            (
                host,
                "/subscriptions?status=active&per_page=1",
                format!("Authorization: Bearer {secret}\r\nPaddle-Version: 1\r\n"),
            )
        }
        "dodo" => {
            let host = match resource.unwrap_or("live") {
                "live" => "live.dodopayments.com",
                "test" => "test.dodopayments.com",
                _ => return Err("Invalid Dodo environment".into()),
            };
            (
                host,
                "/payments?page_size=1&page_number=1",
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "twelvedata_metals" => {
            let symbol = resource.unwrap_or("XAU/USD");
            if !["XAU/USD", "XAG/USD"].contains(&symbol) {
                return Err("Invalid metal symbol".into());
            }
            let query = url::form_urlencoded::Serializer::new(String::new())
                .append_pair("symbol", symbol)
                .append_pair("apikey", secret)
                .finish();
            metals_path = format!("/quote?{query}");
            ("api.twelvedata.com", metals_path.as_str(), String::new())
        }
        "fmp_indices" => {
            let symbol = resource.unwrap_or("^GSPC");
            if !["^GSPC", "^NDX"].contains(&symbol) {
                return Err("Unsupported index symbol".into());
            }
            let query = url::form_urlencoded::Serializer::new(String::new())
                .append_pair("symbol", symbol)
                .append_pair("apikey", secret)
                .finish();
            index_path = format!("/stable/quote?{query}");
            (
                "financialmodelingprep.com",
                index_path.as_str(),
                String::new(),
            )
        }
        "google_service_token" => {
            post_body = Some(
                url::form_urlencoded::Serializer::new(String::new())
                    .append_pair("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
                    .append_pair("assertion", secret)
                    .finish()
                    .into_bytes(),
            );
            (
                "oauth2.googleapis.com",
                "/token",
                "Content-Type: application/x-www-form-urlencoded\r\n".into(),
            )
        }
        "play_report" => {
            let mut p = resource.unwrap_or("").split(',');
            let bucket = p.next().unwrap_or("");
            let object = p.next().unwrap_or("");
            if p.next().is_some()
                || !bucket.starts_with("pubsite_prod_rev_")
                || bucket.len() > 100
                || !bucket
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'_')
                || !object.starts_with("stats/installs/installs_")
                || !object.ends_with("_country.csv")
                || object.len() > 250
                || !object
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"_/.-".contains(&b))
            {
                return Err("Invalid Google Play report location".into());
            }
            let object: String = url::form_urlencoded::byte_serialize(object.as_bytes()).collect();
            play_path = format!("/storage/v1/b/{bucket}/o/{object}?alt=media");
            (
                "storage.googleapis.com",
                play_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "appstore_sales" => {
            let mut parts = resource.unwrap_or("").split(',');
            let vendor = parts.next().unwrap_or("");
            let date = parts.next().unwrap_or("");
            if parts.next().is_some()
                || vendor.is_empty()
                || vendor.len() > 20
                || !vendor.bytes().all(|b| b.is_ascii_digit())
                || date.len() != 10
                || !date.bytes().enumerate().all(|(i, b)| {
                    if i == 4 || i == 7 {
                        b == b'-'
                    } else {
                        b.is_ascii_digit()
                    }
                })
            {
                return Err("Invalid App Store vendor or report date".into());
            }
            let query = url::form_urlencoded::Serializer::new(String::new())
                .append_pair("filter[vendorNumber]", vendor)
                .append_pair("filter[reportDate]", date)
                .append_pair("filter[frequency]", "DAILY")
                .append_pair("filter[reportType]", "SALES")
                .append_pair("filter[reportSubType]", "SUMMARY")
                .append_pair("filter[version]", "1_0")
                .finish();
            appstore_path = format!("/v1/salesReports?{query}");
            (
                "api.appstoreconnect.apple.com",
                appstore_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "cursor_team" => {
            let mut parts = resource.unwrap_or("").split(',');
            let start = parts
                .next()
                .unwrap_or("")
                .parse::<u64>()
                .map_err(|_| "Invalid Cursor start date")?;
            let end = parts
                .next()
                .unwrap_or("")
                .parse::<u64>()
                .map_err(|_| "Invalid Cursor end date")?;
            if parts.next().is_some() || end < start || end - start > 172_800_000 {
                return Err("Invalid Cursor report period".into());
            }
            post_body = Some(
                serde_json::to_vec(&serde_json::json!({"startDate":start,"endDate":end}))
                    .map_err(|_| "Invalid Cursor request")?,
            );
            (
                "api.cursor.com",
                "/teams/daily-usage-data",
                format!(
                    "Authorization: Basic {}\r\nContent-Type: application/json\r\n",
                    STANDARD.encode(format!("{secret}:"))
                ),
            )
        }
        "copilot_report" => {
            let org = resource.unwrap_or("");
            if org.is_empty()
                || org.len() > 39
                || !org.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
            {
                return Err("Enter a GitHub organization name".into());
            }
            copilot_path =
                format!("/orgs/{org}/copilot/metrics/reports/organization-28-day/latest");
            ("api.github.com",copilot_path.as_str(),format!("Authorization: Bearer {secret}\r\nAccept: application/vnd.github+json\r\nX-GitHub-Api-Version: 2026-03-10\r\n"))
        }
        "opencode_local" => {
            let mut p = resource.unwrap_or("").split(',');
            port = p
                .next()
                .unwrap_or("")
                .parse::<u16>()
                .map_err(|_| "Invalid OpenCode port")?;
            let session = p.next().unwrap_or("");
            let version = p.next().unwrap_or("legacy");
            if port == 0
                || p.next().is_some()
                || session.is_empty()
                || session.len() > 128
                || !session
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'_')
                || !["legacy", "v2"].contains(&version)
            {
                return Err("Set OpenCode port, session ID and API version".into());
            }
            secure = false;
            opencode_path = if version == "v2" {
                format!("/api/session/{session}/message?limit=10&order=desc")
            } else {
                format!("/session/{session}/message?limit=10")
            };
            let header = if secret == "-" {
                String::new()
            } else {
                format!(
                    "Authorization: Basic {}\r\n",
                    STANDARD.encode(format!("opencode:{secret}"))
                )
            };
            ("127.0.0.1", opencode_path.as_str(), header)
        }
        "ga4" => {
            ga4_path = ga4_target(resource.unwrap_or(""))?;
            post_body = Some(serde_json::to_vec(&serde_json::json!({"metrics":[{"name":"activeUsers"},{"name":"screenPageViews"}],"minuteRanges":[{"startMinutesAgo":29,"endMinutesAgo":0}]})).map_err(|_| "Invalid analytics request")?);
            (
                "analyticsdata.googleapis.com",
                ga4_path.as_str(),
                format!("Authorization: Bearer {secret}\r\nContent-Type: application/json\r\n"),
            )
        }
        "shopify" => {
            let (host, start) = shopify_target(resource.unwrap_or(""))?;
            shopify_host = host;
            post_body = Some(serde_json::to_vec(&serde_json::json!({"query":"query OrdersCount($filter: String!) { ordersCount(limit: null, query: $filter) { count precision } }","variables":{"filter":format!("created_at:>='{start}'")}})).map_err(|_| "Invalid Shopify request")?);
            (
                shopify_host.as_str(),
                "/admin/api/2026-10/graphql.json",
                format!("X-Shopify-Access-Token: {secret}\r\nContent-Type: application/json\r\n"),
            )
        }
        "google_calendar" => {
            let path = secret
                .strip_prefix("https://calendar.google.com")
                .ok_or("Expected a Google Calendar HTTPS link")?;
            if !path.starts_with("/calendar/ical/") {
                return Err("Expected a Google Calendar iCalendar link".into());
            }
            ("calendar.google.com", path, String::new())
        }
        "gemini" => (
            "generativelanguage.googleapis.com",
            "/v1beta/models",
            format!("x-goog-api-key: {secret}\r\n"),
        ),
        "openai" => (
            "api.openai.com",
            "/v1/models",
            format!("Authorization: Bearer {secret}\r\n"),
        ),
        "github" => (
            "api.github.com",
            "/user",
            format!("Authorization: Bearer {secret}\r\nAccept: application/vnd.github+json\r\n"),
        ),
        "anthropic" => (
            "api.anthropic.com",
            "/v1/models?limit=1",
            format!("x-api-key: {secret}\r\nanthropic-version: 2023-06-01\r\n"),
        ),
        "todoist" => (
            "api.todoist.com",
            "/api/v1/tasks/filter?query=today%20%7C%20overdue&limit=200",
            format!("Authorization: Bearer {secret}\r\n"),
        ),
        "vercel" => {
            vercel_path = match resource {
                None => "/v2/user".to_owned(),
                Some(value) => vercel_deployments_path(value)?,
            };
            (
                "api.vercel.com",
                vercel_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "deepseek" => (
            "api.deepseek.com",
            "/user/balance",
            format!("Authorization: Bearer {secret}\r\n"),
        ),
        "stripe_charges" | "stripe_net" => {
            stripe_charges_path = match resource {
                Some(value) => stripe_page_target(value, provider == "stripe_net")?,
                None => {
                    if provider == "stripe_net" {
                        "/v1/balance_transactions?limit=1".to_string()
                    } else {
                        "/v1/charges?limit=1".to_string()
                    }
                }
            };
            (
                "api.stripe.com",
                stripe_charges_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "stripe_subscriptions" => {
            stripe_subscriptions_path = match resource {
                Some(value) => stripe_subscription_target(value)?,
                None => "/v1/subscriptions?limit=1".to_string(),
            };
            (
                "api.stripe.com",
                stripe_subscriptions_path.as_str(),
                format!("Authorization: Bearer {secret}\r\n"),
            )
        }
        "stripe" => (
            "api.stripe.com",
            "/v1/balance",
            format!("Authorization: Bearer {secret}\r\n"),
        ),
        "wakatime" => (
            "wakatime.com",
            "/api/v1/users/current/stats/last_7_days",
            format!(
                "Authorization: Basic {}\r\n",
                STANDARD.encode(format!("{secret}:"))
            ),
        ),
        _ => return Err("Automatic verification is not available for this service".into()),
    };
    let host: Vec<u16> = host.encode_utf16().chain(Some(0)).collect();
    let path: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
    let header: Vec<u16> = header.encode_utf16().collect();
    unsafe {
        let session = WinHttpOpen(
            w!("Atelier/1.0"),
            WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
            PCWSTR::null(),
            PCWSTR::null(),
            0,
        );
        if session.is_null() {
            return Err("Could not start service connection".into());
        }
        let session = InternetHandle(session);
        WinHttpSetTimeouts(session.0, 6000, 6000, 6000, 6000)
            .map_err(|_| "Could not set service timeout")?;
        let connection = WinHttpConnect(session.0, PCWSTR(host.as_ptr()), port, 0);
        if connection.is_null() {
            return Err("Could not connect to service".into());
        }
        let connection = InternetHandle(connection);
        let request = WinHttpOpenRequest(
            connection.0,
            if post_body.is_some() {
                w!("POST")
            } else {
                w!("GET")
            },
            PCWSTR(path.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            ptr::null(),
            if secure {
                WINHTTP_FLAG_SECURE
            } else {
                Default::default()
            },
        );
        if request.is_null() {
            return Err("Could not create service request".into());
        }
        let request = InternetHandle(request);
        WinHttpSetOption(
            Some(request.0),
            WINHTTP_OPTION_DISABLE_FEATURE,
            Some(&WINHTTP_DISABLE_REDIRECTS.to_ne_bytes()),
        )
        .map_err(|_| "Could not secure service request")?;
        WinHttpSendRequest(
            request.0,
            if header.is_empty() {
                None
            } else {
                Some(&header)
            },
            post_body.as_ref().map(|body| body.as_ptr().cast()),
            post_body.as_ref().map_or(0, |body| body.len() as u32),
            post_body.as_ref().map_or(0, |body| body.len() as u32),
            0,
        )
        .map_err(|_| "Could not send service request")?;
        WinHttpReceiveResponse(request.0, ptr::null_mut())
            .map_err(|_| "Could not receive service response")?;
        let mut status = 0u32;
        let mut length = std::mem::size_of::<u32>() as u32;
        let mut index = 0u32;
        WinHttpQueryHeaders(
            request.0,
            WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
            PCWSTR::null(),
            Some((&mut status as *mut u32).cast()),
            &mut length,
            &mut index,
        )
        .map_err(|_| "Could not read service response")?;
        if [301, 302, 303, 307, 308].contains(&status)
            && ["public_feed", "google_calendar"].contains(&provider)
        {
            let mut size = 0u32;
            let _ = WinHttpQueryHeaders(
                request.0,
                WINHTTP_QUERY_LOCATION,
                PCWSTR::null(),
                None,
                &mut size,
                ptr::null_mut(),
            );
            if size == 0 || size > 16384 || size % 2 != 0 {
                return Err("Invalid feed redirect location".into());
            }
            let mut location = vec![0u16; size as usize / 2 + 1];
            WinHttpQueryHeaders(
                request.0,
                WINHTTP_QUERY_LOCATION,
                PCWSTR::null(),
                Some(location.as_mut_ptr().cast()),
                &mut size,
                ptr::null_mut(),
            )
            .map_err(|_| "Could not read feed redirect")?;
            let location = PCWSTR(location.as_ptr())
                .to_string()
                .map_err(|_| "Invalid feed redirect encoding")?;
            let target = redirect_target(secret, &location, hops)?;
            let result = request_inner("public_feed", &target, None, read_json, hops + 1, started)?;
            if provider == "google_calendar"
                && read_json
                && !result
                    .as_ref()
                    .and_then(|v| v.as_str())
                    .is_some_and(|v| v.contains("BEGIN:VCALENDAR"))
            {
                return Err("The URL did not return an iCalendar feed".into());
            }
            return Ok(result);
        }
        if !(200..300).contains(&status) {
            return Err(format!("Service returned HTTP {status}"));
        }
        if !read_json {
            return Ok(None);
        }
        let mut body = Vec::new();
        loop {
            if started.elapsed() > Duration::from_secs(25) {
                return Err("Service data transfer timed out".into());
            }
            let mut buffer = [0u8; 8192];
            let mut count = 0u32;
            WinHttpReadData(
                request.0,
                buffer.as_mut_ptr().cast(),
                buffer.len() as u32,
                &mut count,
            )
            .map_err(|_| "Could not read service data")?;
            if count == 0 {
                break;
            }
            if body.len() + count as usize
                > if provider == "play_report" {
                    16_777_216
                } else {
                    1_048_576
                }
            {
                return Err("Service response is too large".into());
            }
            body.extend_from_slice(&buffer[..count as usize]);
        }
        if provider == "play_report" {
            let text = if body.starts_with(&[255, 254]) {
                if body.len() % 2 != 0 {
                    return Err("Invalid UTF-16 report".into());
                }
                let chars: Vec<u16> = body[2..]
                    .chunks_exact(2)
                    .map(|v| u16::from_le_bytes([v[0], v[1]]))
                    .collect();
                String::from_utf16(&chars).map_err(|_| "Invalid report encoding")?
            } else {
                String::from_utf8(body).map_err(|_| "Invalid report encoding")?
            };
            return Ok(Some(serde_json::Value::String(text)));
        }
        if provider == "appstore_sales" {
            use std::io::Read;
            let mut decoded = Vec::new();
            flate2::read::GzDecoder::new(body.as_slice())
                .take(16_777_217)
                .read_to_end(&mut decoded)
                .map_err(|_| "Invalid compressed App Store report")?;
            if decoded.len() > 16_777_216 {
                return Err("App Store report is too large".into());
            }
            return Ok(Some(serde_json::Value::String(
                String::from_utf8(decoded).map_err(|_| "Invalid report encoding")?,
            )));
        }
        if provider == "public_feed" {
            let text = String::from_utf8(body).map_err(|_| "Feed returned invalid UTF-8")?;
            return Ok(Some(serde_json::Value::String(text)));
        }
        if provider == "google_calendar" {
            let text = String::from_utf8(body).map_err(|_| "Calendar returned invalid data")?;
            if !text.contains("BEGIN:VCALENDAR") {
                return Err("The URL did not return an iCalendar feed".into());
            }
            return Ok(Some(serde_json::Value::String(text)));
        }
        let mut value: serde_json::Value =
            serde_json::from_slice(&body).map_err(|_| "Service returned invalid data")?;
        if provider == "perplexity_credits" {
            value = serde_json::json!({"balance":value.get("balance_cents").or_else(||value.get("balanceCents")),"usage":value.get("total_usage_cents").or_else(||value.get("totalUsageCents")),"renews_at":value.get("renewal_date_ts").or_else(||value.get("renewalDateTs"))});
        }
        if provider == "opencode_local" {
            let rows = value
                .as_array()
                .or_else(|| value.get("data").and_then(|v| v.as_array()))
                .ok_or("OpenCode returned unsupported message data")?;
            value = serde_json::json!({"messages":rows.iter().map(|row|{let info=row.get("info").unwrap_or(row);serde_json::json!({"role":info.get("role"),"tokens":info.get("tokens"),"modelID":info.get("modelID"),"time":info.get("time")})}).collect::<Vec<_>>()});
        }
        if provider == "cursor_team" {
            let rows = value
                .get("data")
                .and_then(|v| v.as_array())
                .ok_or("Cursor returned invalid usage")?;
            value = serde_json::json!({"data":rows.iter().map(|row|serde_json::json!({"agentRequests":row.get("agentRequests"),"chatRequests":row.get("chatRequests"),"composerRequests":row.get("composerRequests")})).collect::<Vec<_>>()});
        }
        if provider == "dodo" || provider == "dodo_payments" {
            let items = value
                .get("items")
                .and_then(|v| v.as_array())
                .ok_or("Dodo returned invalid payments")?;
            let payments: Vec<_>=items.iter().map(|item| serde_json::json!({"payment_id":item.get("payment_id"),"status":item.get("status"),"currency":item.get("currency"),"total_amount":item.get("total_amount"),"created_at":item.get("created_at")})).collect();
            value = serde_json::json!({"items":payments});
        }
        Ok(Some(value))
    }
}

fn perplexity_cookie(name: &str, token: &str) -> Result<String, String> {
    if ![
        "__Secure-authjs.session-token",
        "authjs.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.session-token",
    ]
    .contains(&name)
        || token.is_empty()
        || token.len() > 16384
        || !token
            .bytes()
            .all(|b| (0x21..=0x7e).contains(&b) && ![b'"', b',', b';', b'\\'].contains(&b))
    {
        return Err(
            "Enter only the Perplexity session-token value and select its cookie name".into(),
        );
    }
    Ok(format!("Cookie: {name}={token}\r\n"))
}
fn revenue_range(value: &serde_json::Value) -> Result<(String, String), String> {
    let parse = |name| {
        value
            .get(name)
            .and_then(|v| v.as_str())
            .and_then(|v| chrono::DateTime::parse_from_rfc3339(v).ok())
            .ok_or("Invalid revenue report date")
    };
    let start = parse("start")?;
    let end = parse("end")?;
    if start.timestamp() < 1577836800
        || end <= start
        || end.timestamp() - start.timestamp() > 32 * 86400
    {
        return Err("Revenue report range must be within 32 days".into());
    }
    let format = |value: chrono::DateTime<chrono::FixedOffset>| {
        value
            .with_timezone(&chrono::Utc)
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
    };
    Ok((format(start), format(end)))
}
fn paddle_metric_target(resource: &str) -> Result<(&'static str, String), String> {
    let value: serde_json::Value =
        serde_json::from_str(resource).map_err(|_| "Invalid Paddle metrics settings")?;
    let host = match value["environment"].as_str() {
        Some("live") => "api.paddle.com",
        Some("sandbox") => "sandbox-api.paddle.com",
        _ => return Err("Invalid Paddle environment".into()),
    };
    let metric = match value["metric"].as_str() {
        Some("mrr") => "monthly-recurring-revenue",
        Some("revenue") => "revenue",
        Some("conversion") => "checkout-conversion",
        _ => return Err("Unknown Paddle metric".into()),
    };
    let parse = |name| {
        value
            .get(name)
            .and_then(|v| v.as_str())
            .and_then(|v| chrono::NaiveDate::parse_from_str(v, "%Y-%m-%d").ok())
            .ok_or("Invalid Paddle metrics date")
    };
    let from = parse("from")?;
    let to = parse("to")?;
    if to <= from || to.signed_duration_since(from).num_days() > 366 {
        return Err("Paddle metrics range must be within one year".into());
    }
    Ok((host, format!("/metrics/{metric}?from={from}&to={to}")))
}
fn dodo_payments_target(resource: &str) -> Result<(&'static str, String), String> {
    let value: serde_json::Value =
        serde_json::from_str(resource).map_err(|_| "Invalid Dodo report settings")?;
    let host = match value["environment"].as_str() {
        Some("live") => "live.dodopayments.com",
        Some("test") => "test.dodopayments.com",
        _ => return Err("Invalid Dodo environment".into()),
    };
    let page = value["page"]
        .as_u64()
        .filter(|v| (1..=100).contains(v))
        .ok_or("Invalid Dodo page number")?;
    let (start, end) = revenue_range(&value)?;
    let query = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("page_size", "100")
        .append_pair("page_number", &page.to_string())
        .append_pair("created_at_gte", &start)
        .append_pair("created_at_lte", &end)
        .finish();
    Ok((host, format!("/payments?{query}")))
}
fn ai_cost_target(provider: &str, resource: &str) -> Result<String, String> {
    let value: serde_json::Value =
        serde_json::from_str(resource).map_err(|_| "Invalid cost report range")?;
    let start = value["start"].as_i64().ok_or("Invalid cost report start")?;
    let end = value["end"].as_i64().ok_or("Invalid cost report end")?;
    if start < 1577836800 || end <= start || end - start > 32 * 86400 || end > 4102444800 {
        return Err("Cost report range must be within 32 days".into());
    }
    let page = value.get("page").and_then(|v| v.as_str()).unwrap_or("");
    if page.len() > 2048 || !page.bytes().all(|b| (0x21..=0x7e).contains(&b)) {
        return Err("Invalid cost report cursor".into());
    }
    let mut query = url::form_urlencoded::Serializer::new(String::new());
    let endpoint = if provider == "openai_costs" {
        query
            .append_pair("start_time", &start.to_string())
            .append_pair("end_time", &end.to_string())
            .append_pair("bucket_width", "1d")
            .append_pair("limit", "31");
        "/v1/organization/costs"
    } else {
        let format = |time| {
            chrono::DateTime::from_timestamp(time, 0)
                .map(|v| v.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
                .ok_or("Invalid cost report date")
        };
        query
            .append_pair("starting_at", &format(start)?)
            .append_pair("ending_at", &format(end)?)
            .append_pair("limit", "1000");
        "/v1/organizations/analytics/cost"
    };
    if !page.is_empty() {
        query.append_pair("page", page);
    }
    Ok(format!("{endpoint}?{}", query.finish()))
}

fn vercel_deployments_path(resource: &str) -> Result<String, String> {
    let mut parts = resource.split(',');
    let project = parts.next().unwrap_or("");
    let team = parts.next().unwrap_or("");
    let valid = |value: &str| {
        !value.is_empty()
            && value.len() <= 128
            && value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    };
    if !valid(project) || (!team.is_empty() && !valid(team)) || parts.next().is_some() {
        return Err("Invalid Vercel project or team ID".into());
    }
    Ok(format!(
        "/v6/deployments?limit=1&target=production&projectId={project}{}",
        if team.is_empty() {
            String::new()
        } else {
            format!("&teamId={team}")
        }
    ))
}

fn gitlab_target(resource: &str) -> Result<(String, String, u16), String> {
    let mut parts = resource.split(',');
    let host = parts.next().unwrap_or("").trim();
    let project = parts.next();
    if parts.next().is_some() || host.is_empty() {
        return Err("Invalid GitLab host".into());
    }
    let url = url::Url::parse(&format!("https://{host}")).map_err(|_| "Invalid GitLab host")?;
    if url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Enter a GitLab host without a path or credentials".into());
    }
    let path = match project {
        None => "/api/v4/user".into(),
        Some(id) if !id.is_empty() && id.len() <= 20 && id.bytes().all(|b| b.is_ascii_digit()) => {
            format!("/api/v4/projects/{id}/pipelines?per_page=1")
        }
        _ => return Err("Enter a numeric GitLab project ID".into()),
    };
    Ok((
        url.host_str().unwrap().to_string(),
        path,
        url.port_or_known_default().unwrap_or(443),
    ))
}

fn stripe_page_target(resource: &str, balance: bool) -> Result<String, String> {
    let mut parts = resource.split(',');
    let start = parts.next().unwrap_or("");
    let cursor = parts.next().unwrap_or("");
    if parts.next().is_some()
        || start.is_empty()
        || start.len() > 12
        || !start.bytes().all(|c| c.is_ascii_digit())
        || (!cursor.is_empty()
            && (!cursor.starts_with(if balance { "txn_" } else { "ch_" })
                || cursor.len() > 128
                || !cursor
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'_')))
    {
        return Err("Invalid Stripe charge pagination".into());
    }
    Ok(format!(
        "/v1/{}?limit=100&created%5Bgte%5D={start}{}",
        if balance {
            "balance_transactions"
        } else {
            "charges"
        },
        if cursor.is_empty() {
            String::new()
        } else {
            format!("&starting_after={cursor}")
        }
    ))
}

fn stripe_subscription_target(resource: &str) -> Result<String, String> {
    let mut parts = resource.split(',');
    let status = parts.next().unwrap_or("");
    let cursor = parts.next().unwrap_or("");
    if parts.next().is_some()
        || !["active", "past_due"].contains(&status)
        || (!cursor.is_empty()
            && (!cursor.starts_with("sub_")
                || cursor.len() > 128
                || !cursor
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'_')))
    {
        return Err("Invalid subscription pagination".into());
    }
    Ok(format!(
        "/v1/subscriptions?limit=100&status={status}{}",
        if cursor.is_empty() {
            String::new()
        } else {
            format!("&starting_after={cursor}")
        }
    ))
}

fn polar_metrics_target(resource: &str) -> Result<String, String> {
    let mut parts = resource.split(',');
    let start = parts.next().unwrap_or("");
    let end = parts.next().unwrap_or("");
    let org = parts.next().unwrap_or("");
    let date = |s: &str| {
        s.len() == 10
            && s.bytes().enumerate().all(|(i, b)| {
                if i == 4 || i == 7 {
                    b == b'-'
                } else {
                    b.is_ascii_digit()
                }
            })
    };
    if parts.next().is_some()
        || !date(start)
        || !date(end)
        || (!org.is_empty()
            && (org.len() != 36
                || !org.bytes().enumerate().all(|(i, b)| {
                    if [8, 13, 18, 23].contains(&i) {
                        b == b'-'
                    } else {
                        b.is_ascii_hexdigit()
                    }
                })))
    {
        return Err("Invalid Polar dates or organization ID".into());
    }
    Ok(format!(
        "/v1/metrics?start_date={start}&end_date={end}&interval=day{}",
        if org.is_empty() {
            String::new()
        } else {
            format!("&organization_id={org}")
        }
    ))
}

fn ga4_target(property: &str) -> Result<String, String> {
    if property.is_empty() || property.len() > 20 || !property.bytes().all(|c| c.is_ascii_digit()) {
        return Err("Enter a numeric GA4 property ID".into());
    }
    Ok(format!("/v1beta/properties/{property}:runRealtimeReport"))
}

fn shopify_target(resource: &str) -> Result<(String, String), String> {
    let mut parts = resource.split(',');
    let host = parts.next().unwrap_or("").to_ascii_lowercase();
    let start = parts.next().unwrap_or("");
    let name = host
        .strip_suffix(".myshopify.com")
        .ok_or("Enter your myshopify.com domain")?;
    if parts.next().is_some()
        || name.is_empty()
        || name.len() > 63
        || name.starts_with('-')
        || name.ends_with('-')
        || !name.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err("Enter a valid myshopify.com domain".into());
    }
    if start.len() != 24
        || !start.bytes().enumerate().all(|(i, b)| match i {
            4 | 7 => b == b'-',
            10 => b == b'T',
            13 | 16 => b == b':',
            19 => b == b'.',
            23 => b == b'Z',
            _ => b.is_ascii_digit(),
        })
    {
        return Err("Invalid Shopify date".into());
    }
    Ok((host, start.to_string()))
}

#[tauri::command]
pub async fn widget_verify_service(
    window: tauri::Window,
    provider: String,
    secret: String,
    resource: Option<String>,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Service verification is unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let data = request(
            &provider,
            &secret,
            resource.as_deref(),
            provider == "google_calendar"
                || provider == "alphavantage"
                || provider == "xai_management"
                || provider == "datafast"
                || provider == "polar"
                || provider == "paddle"
                || provider == "dodo"
                || provider == "shopify"
                || provider == "ga4"
                || provider == "twelvedata_metals"
                || provider == "fmp_indices"
                || provider == "cursor_team"
                || provider == "copilot_report",
        )?;
        if provider == "alphavantage"
            && data
                .as_ref()
                .and_then(|v| v.get("Global Quote"))
                .and_then(|v| v.get("05. price"))
                .and_then(|v| v.as_str())
                .is_none()
        {
            return Err("Alpha Vantage did not return a quote; check the key or rate limit".into());
        }
        if provider == "xai_management"
            && data
                .as_ref()
                .and_then(|v| v.get("total"))
                .and_then(|v| v.get("val"))
                .and_then(|v| v.as_str())
                .and_then(|v| v.parse::<i64>().ok())
                .is_none()
        {
            return Err("xAI did not return a prepaid balance".into());
        }
        if provider == "datafast"
            && data
                .as_ref()
                .and_then(|v| v.get("data"))
                .and_then(|v| v.get(0))
                .and_then(|v| v.get("visitors"))
                .and_then(|v| v.as_u64())
                .is_none()
        {
            return Err("DataFast did not return a visitor count".into());
        }
        if provider == "polar"
            && data
                .as_ref()
                .and_then(|v| v.get("periods"))
                .and_then(|v| v.as_array())
                .is_none()
        {
            return Err("Polar returned invalid metrics".into());
        }
        if provider == "paddle"
            && data
                .as_ref()
                .and_then(|v| v.get("meta"))
                .and_then(|v| v.get("pagination"))
                .and_then(|v| v.get("estimated_total"))
                .and_then(|v| v.as_i64())
                .filter(|v| *v >= 0)
                .is_none()
        {
            return Err("Paddle returned no subscription count".into());
        }
        if provider == "dodo"
            && data
                .as_ref()
                .and_then(|v| v.get("items"))
                .and_then(|v| v.as_array())
                .is_none()
        {
            return Err("Dodo returned invalid payments".into());
        }
        if provider == "shopify"
            && data
                .as_ref()
                .and_then(|v| v.get("errors"))
                .and_then(|v| v.as_array())
                .is_some_and(|v| !v.is_empty())
        {
            return Err("Shopify returned an error; check read_orders permission".into());
        }
        if provider == "shopify"
            && data
                .as_ref()
                .and_then(|v| v.get("data"))
                .and_then(|v| v.get("ordersCount"))
                .and_then(|v| v.get("count"))
                .and_then(|v| v.as_u64())
                .is_none()
        {
            return Err(
                "Shopify did not return an order count; check read_orders permission".into(),
            );
        }
        if provider == "ga4"
            && data
                .as_ref()
                .and_then(|v| v.get("metricHeaders"))
                .and_then(|v| v.as_array())
                .is_none()
        {
            return Err(
                "GA4 did not return analytics; check token access and Data API setup".into(),
            );
        }
        if provider == "twelvedata_metals"
            && data
                .as_ref()
                .and_then(|v| v.get("close"))
                .and_then(|v| v.as_str())
                .and_then(|v| v.parse::<f64>().ok())
                .filter(|v| v.is_finite() && *v > 0.0)
                .is_none()
        {
            return Err("Twelve Data returned no metal quote; check key, plan and quota".into());
        }
        if provider == "fmp_indices"
            && data
                .as_ref()
                .and_then(|v| v.get(0))
                .and_then(|v| v.get("price"))
                .and_then(|v| v.as_f64())
                .filter(|v| v.is_finite() && *v > 0.0)
                .is_none()
        {
            return Err(
                "FMP did not return an index quote; check key and index entitlement".into(),
            );
        }
        if provider == "cursor_team"
            && data
                .as_ref()
                .and_then(|v| v.get("data"))
                .and_then(|v| v.as_array())
                .is_none()
        {
            return Err("Cursor returned invalid team usage".into());
        }
        if provider == "copilot_report"
            && data
                .as_ref()
                .and_then(|v| v.get("download_links"))
                .and_then(|v| v.as_array())
                .is_none()
        {
            return Err("GitHub returned no Copilot report links".into());
        }
        Ok(())
    })
    .await
    .map_err(|_| "Service verification failed".to_string())?
}

#[tauri::command]
pub async fn widget_service_data(
    window: tauri::Window,
    provider: String,
    secret: String,
    resource: Option<String>,
) -> Result<serde_json::Value, String> {
    let label = window.label();
    let permitted = match provider.as_str() {
        "deepseek" => label == "widget-ai_deepseek",
        "wakatime" => label == "widget-dev_wakatime",
        "google_calendar" => label == "widget-prod_gcal" || label == "widget-prod_calendar_event",
        "todoist" => label == "widget-prod_todoist",
        "vercel" => label == "widget-dev_vercel",
        "gitlab" => label == "widget-dev_gitlab_ci",
        "stripe_charges" => label == "widget-rev_stripe_today",
        "stripe_net" => label == "widget-rev_stripe_net",
        "stripe_subscriptions" => label == "widget-rev_stripe_mrr",
        "xai_management" => label == "widget-ai_grok",
        "lemonsqueezy" => label == "widget-rev_lemonsqueezy",
        "datafast" => label == "widget-rev_datafast",
        "polar" => label == "widget-rev_polar",
        "paddle" => label == "widget-rev_paddle",
        "paddle_metrics" => label == "widget-rev_paddle",
        "dodo" => label == "widget-rev_dodo",
        "dodo_payments" => label == "widget-rev_dodo",
        "shopify" => label == "widget-rev_shopify",
        "shopify_orders" => label == "widget-rev_shopify",
        "ga4" => label == "widget-rev_google_analytics",
        "twelvedata_metals" => label == "widget-fin_gold",
        "fmp_indices" => ["widget-fin_sp500", "widget-fin_nasdaq"].contains(&label),
        "cursor_team" => label == "widget-ai_cursor",
        "copilot_report" => label == "widget-ai_copilot",
        "opencode_local" => label == "widget-ai_opencode",
        "glm_quota" => label == "widget-ai_glm",
        "perplexity_credits" => label == "widget-ai_perplexity",
        "openai_costs" => label == "widget-ai_openai_balance",
        "anthropic_costs" => label == "widget-ai_anthropic_balance",
        "alphavantage" => [
            "widget-fin_stock_aapl",
            "widget-fin_stock_nvda",
            "widget-fin_stock_tsla",
        ]
        .contains(&label),
        "public_feed" => {
            label == "widget-util_rss"
                || label == "widget-prod_gcal"
                || label == "widget-prod_calendar_event"
                || label == "widget-ai_copilot"
        }
        _ => false,
    };
    if !permitted && !(label == "main" || label == "desktop-dock") {
        return Err("Service data is unavailable to this window".into());
    }
    if !matches!(
        provider.as_str(),
        "deepseek"
            | "wakatime"
            | "google_calendar"
            | "todoist"
            | "vercel"
            | "gitlab"
            | "stripe_charges"
            | "stripe_net"
            | "stripe_subscriptions"
            | "xai_management"
            | "lemonsqueezy"
            | "datafast"
            | "polar"
            | "paddle"
            | "paddle_metrics"
            | "dodo"
            | "dodo_payments"
            | "shopify"
            | "shopify_orders"
            | "ga4"
            | "twelvedata_metals"
            | "fmp_indices"
            | "cursor_team"
            | "copilot_report"
            | "opencode_local"
            | "glm_quota"
            | "perplexity_credits"
            | "openai_costs"
            | "anthropic_costs"
            | "alphavantage"
            | "public_feed"
    ) {
        return Err("Service data is unavailable".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        if (provider == "vercel"
            || provider == "gitlab"
            || provider == "alphavantage"
            || provider == "stripe_charges"
            || provider == "stripe_net"
            || provider == "stripe_subscriptions")
            && resource.is_none()
        {
            return Err("Set a project ID".into());
        }
        request(&provider, &secret, resource.as_deref(), true)?
            .ok_or_else(|| "Service returned no data".to_string())
    })
    .await
    .map_err(|_| "Service request failed".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn revenue_targets_and_session_cookies_cannot_escape_fixed_providers() {
        let value = serde_json::json!({"environment":"sandbox","metric":"mrr","from":"2026-11-01","to":"2026-11-08"});
        assert_eq!(
            paddle_metric_target(&value.to_string()).unwrap(),
            (
                "sandbox-api.paddle.com",
                "/metrics/monthly-recurring-revenue?from=2026-11-01&to=2026-11-08".into()
            )
        );
        let mut bad = value.clone();
        bad["metric"] = "../balance".into();
        assert!(paddle_metric_target(&bad.to_string()).is_err());
        bad = value.clone();
        bad["environment"] = "sandbox.evil".into();
        assert!(paddle_metric_target(&bad.to_string()).is_err());
        let report = serde_json::json!({"environment":"test","page":2,"start":"2026-11-01T00:00:00.000Z","end":"2026-11-08T12:00:00.000Z"});
        let (host, path) = dodo_payments_target(&report.to_string()).unwrap();
        assert_eq!(host, "test.dodopayments.com");
        assert!(path.contains("page_number=2"));
        assert!(path.contains("created_at_gte=2026-11-01T00%3A00%3A00.000Z"));
        let mut bad = report.clone();
        bad["page"] = 101.into();
        assert!(dodo_payments_target(&bad.to_string()).is_err());
        bad = report;
        bad["start"] = "2026-99-99".into();
        assert!(revenue_range(&bad).is_err());
        assert_eq!(
            perplexity_cookie("__Secure-authjs.session-token", "token.value=").unwrap(),
            "Cookie: __Secure-authjs.session-token=token.value=\r\n"
        );
        for token in [
            "",
            "value; second=secret",
            "value\r\nAuthorization:secret",
            "Cookie: value",
        ] {
            assert!(perplexity_cookie("__Secure-authjs.session-token", token).is_err());
        }
        assert!(perplexity_cookie("other-cookie", "valid").is_err());
    }
    #[test]
    fn public_feed_redirects_resolve_relative_paths_and_refuse_downgrades() {
        assert_eq!(
            redirect_target("https://example.com/feeds/old?secret=123", "../new.xml", 0).unwrap(),
            "https://example.com/new.xml"
        );
        assert_eq!(
            redirect_target(
                "https://example.com/old",
                "https://feeds.example.net/new#fragment",
                4
            )
            .unwrap(),
            "https://feeds.example.net/new"
        );
        for target in [
            "http://example.com/feed",
            "file:///C:/keys/key.json",
            "https://name:secret@example.com/feed",
            "https://example.com/feed\r\nAuthorization:secret",
            "",
        ] {
            assert!(redirect_target("https://example.com/feed", target, 0).is_err());
        }
        assert!(redirect_target("https://example.com/feed", "/again", 5).is_err());
    }
    #[test]
    fn cost_reports_validate_ranges_and_encode_opaque_cursors() {
        let resource = serde_json::json!({"start":1793491200i64,"end":1793577600i64,"page":"next/page&limit=999"}).to_string();
        let path = ai_cost_target("openai_costs", &resource).unwrap();
        let url = url::Url::parse(&format!("https://api.openai.com{path}")).unwrap();
        assert_eq!(url.path(), "/v1/organization/costs");
        let params: std::collections::HashMap<_, _> = url.query_pairs().collect();
        assert_eq!(params.get("limit").unwrap(), "31");
        assert_eq!(params.get("page").unwrap(), "next/page&limit=999");
        let path = ai_cost_target("anthropic_costs", &resource).unwrap();
        assert!(path.starts_with("/v1/organizations/analytics/cost?starting_at=2026-11-01T00%3A00%3A00Z&ending_at=2026-11-02T00%3A00%3A00Z"));
        for value in [
            "{}",
            "{\"start\":0,\"end\":1}",
            "{\"start\":1793491200,\"end\":1793491200}",
            "{\"start\":1793491200,\"end\":1799000000}",
        ] {
            assert!(ai_cost_target("openai_costs", value).is_err());
        }
        assert!(request("glm_quota", "key", Some("api.z.ai.evil"), true).is_err());
    }
    #[test]
    fn rejects_untrusted_provider_and_header_injection() {
        assert!(request("unknown", "valid-token", None, false).is_err());
        assert!(request("github", "token\r\nInjected: value", None, false).is_err());
        assert!(request("github", "", None, false).is_err());
        assert!(ga4_target("42:runReport").is_err());
        assert_eq!(
            ga4_target("123456").unwrap(),
            "/v1beta/properties/123456:runRealtimeReport"
        );
        assert!(request("dodo", "token", Some("test.evil"), true).is_err());
        assert!(request("paddle", "token", Some("sandbox.evil"), true).is_err());
        assert!(shopify_target("store.myshopify.com.evil,2026-11-08T00:00:00.000Z").is_err());
        assert!(shopify_target("store.myshopify.com,2026-11-08T00:00:00.000Z\"}").is_err());
        assert!(request("alphavantage", "key&other=1", Some("AAPL"), true).is_err());
        assert!(request("alphavantage", "validkey", Some("AAPL&apikey=x"), true).is_err());
        assert!(request("public_feed", "http://example.com/feed", None, true).is_err());
        assert!(request(
            "public_feed",
            "https://user:password@example.com/feed",
            None,
            true
        )
        .is_err());
        assert!(request(
            "google_calendar",
            "https://calendar.google.com.evil.test/calendar/ical/x",
            None,
            false
        )
        .is_err());
        assert!(vercel_deployments_path("project&teamId=evil").is_err());
        assert!(gitlab_target("example.com@evil.test,42").is_err());
        assert!(gitlab_target("gitlab.com,42?private_token=x").is_err());
        assert!(stripe_page_target("123,ch_x&limit=999", false).is_err());
        assert_eq!(
            stripe_page_target("123,ch_ABC", false).unwrap(),
            "/v1/charges?limit=100&created%5Bgte%5D=123&starting_after=ch_ABC"
        );
        assert!(stripe_page_target("123,ch_ABC", true).is_err());
        assert!(stripe_subscription_target("active,sub_123&limit=999").is_err());
        assert!(stripe_subscription_target("canceled,").is_err());
        assert!(polar_metrics_target("2026-01-01,2026-01-02,evil&x=1").is_err());
        assert_eq!(
            stripe_page_target("123,txn_ABC", true).unwrap(),
            "/v1/balance_transactions?limit=100&created%5Bgte%5D=123&starting_after=txn_ABC"
        );
        assert_eq!(
            gitlab_target("gitlab.com,42").unwrap().1,
            "/api/v4/projects/42/pipelines?per_page=1"
        );
        assert_eq!(
            vercel_deployments_path("prj_123,team_456").unwrap(),
            "/v6/deployments?limit=1&target=production&projectId=prj_123&teamId=team_456"
        );
    }
}
