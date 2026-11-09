use std::net::{IpAddr, ToSocketAddrs};
use windows::Win32::NetworkManagement::IpHelper::{
    IcmpCloseHandle, IcmpCreateFile, IcmpSendEcho, ICMP_ECHO_REPLY,
};
fn ping(host: &str) -> Result<u32, String> {
    if host.is_empty()
        || host.len() > 253
        || !host
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'.' || c == b'-')
    {
        return Err("Enter a valid host name or IPv4 address".into());
    }
    let address = (host, 0)
        .to_socket_addrs()
        .map_err(|_| "Host could not be resolved")?
        .find_map(|addr| {
            if let IpAddr::V4(ip) = addr.ip() {
                Some(ip)
            } else {
                None
            }
        })
        .ok_or("No IPv4 address found")?;
    unsafe {
        let handle = IcmpCreateFile().map_err(|_| "ICMP is unavailable")?;
        let payload = b"Atelier";
        let size = std::mem::size_of::<ICMP_ECHO_REPLY>() + payload.len() + 16;
        let mut buffer = vec![0u64; (size + 7) / 8];
        let count = IcmpSendEcho(
            handle,
            u32::from_ne_bytes(address.octets()),
            payload.as_ptr().cast(),
            payload.len() as u16,
            None,
            buffer.as_mut_ptr().cast(),
            (buffer.len() * 8) as u32,
            1500,
        );
        let _ = IcmpCloseHandle(handle);
        if count == 0 {
            return Err("Host did not respond".into());
        }
        let reply = &*(buffer.as_ptr().cast::<ICMP_ECHO_REPLY>());
        if reply.Status != 0 {
            return Err("Host did not respond".into());
        }
        Ok(reply.RoundTripTime)
    }
}
#[tauri::command]
pub async fn widget_ping(window: tauri::Window, host: String) -> Result<u32, String> {
    if window.label() != "desktop-dock" && window.label() != "widget-sys_ping" {
        return Err("Ping is unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || ping(host.trim()))
        .await
        .map_err(|_| "Ping request failed".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_hosts_before_network_access() {
        assert!(ping("").is_err());
        assert!(ping("host;bad").is_err());
        assert!(ping(&"a".repeat(254)).is_err());
    }
}

#[derive(serde::Serialize)]
pub struct WifiState {
    adapter: String,
    ssid: String,
    signal: u32,
}
fn wifi(adapter: &str) -> Result<WifiState, String> {
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::NetworkManagement::WiFi::{
        wlan_interface_state_connected, wlan_intf_opcode_current_connection, WlanCloseHandle,
        WlanEnumInterfaces, WlanFreeMemory, WlanOpenHandle, WlanQueryInterface,
        WLAN_CONNECTION_ATTRIBUTES, WLAN_INTERFACE_INFO_LIST,
    };
    unsafe {
        let mut handle = HANDLE::default();
        let mut version = 0;
        let status = WlanOpenHandle(2, None, &mut version, &mut handle);
        if status != 0 {
            return Err(format!(
                "Wi-Fi service unavailable (Windows error {status})"
            ));
        }
        let result = (|| {
            let mut list: *mut WLAN_INTERFACE_INFO_LIST = std::ptr::null_mut();
            let status = WlanEnumInterfaces(handle, None, &mut list);
            if status != 0 || list.is_null() {
                return Err(format!(
                    "Could not list Wi-Fi adapters (Windows error {status})"
                ));
            }
            let interfaces = std::slice::from_raw_parts(
                (*list).InterfaceInfo.as_ptr(),
                (*list).dwNumberOfItems as usize,
            );
            let mut result = Err("No connected Wi-Fi adapter found".to_string());
            for interface in interfaces {
                let end = interface
                    .strInterfaceDescription
                    .iter()
                    .position(|c| *c == 0)
                    .unwrap_or(interface.strInterfaceDescription.len());
                let name = String::from_utf16_lossy(&interface.strInterfaceDescription[..end]);
                if interface.isState != wlan_interface_state_connected
                    || (!adapter.is_empty()
                        && !name.to_lowercase().contains(&adapter.to_lowercase()))
                {
                    continue;
                }
                let mut size = 0;
                let mut data = std::ptr::null_mut();
                let status = WlanQueryInterface(
                    handle,
                    &interface.InterfaceGuid,
                    wlan_intf_opcode_current_connection,
                    None,
                    &mut size,
                    &mut data,
                    None,
                );
                if status != 0 || data.is_null() {
                    result = Err(format!("Wi-Fi connection details unavailable (Windows error {status}); check location permission"));
                    continue;
                }
                if size as usize >= std::mem::size_of::<WLAN_CONNECTION_ATTRIBUTES>() {
                    let connection = &*(data as *const WLAN_CONNECTION_ATTRIBUTES);
                    let info = &connection.wlanAssociationAttributes;
                    let ssid = &info.dot11Ssid;
                    let length = (ssid.uSSIDLength as usize).min(ssid.ucSSID.len());
                    result = Ok(WifiState {
                        adapter: name,
                        ssid: String::from_utf8_lossy(&ssid.ucSSID[..length]).into_owned(),
                        signal: info.wlanSignalQuality.min(100),
                    });
                } else {
                    result = Err("Windows returned incomplete Wi-Fi information".into());
                }
                WlanFreeMemory(data);
                break;
            }
            WlanFreeMemory(list.cast());
            result
        })();
        let _ = WlanCloseHandle(handle, None);
        result
    }
}
#[tauri::command]
pub async fn widget_wifi(window: tauri::Window, adapter: String) -> Result<WifiState, String> {
    if window.label() != "desktop-dock" && window.label() != "widget-sys_wifi" {
        return Err("Wi-Fi information unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || wifi(adapter.trim()))
        .await
        .map_err(|_| "Wi-Fi request failed".to_string())?
}

fn bluetooth_devices() -> Result<Vec<String>, String> {
    use windows::Devices::Bluetooth::{
        BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice,
    };
    use windows::Devices::Enumeration::DeviceInformation;
    let selectors = [
        BluetoothDevice::GetDeviceSelectorFromConnectionStatus(
            BluetoothConnectionStatus::Connected,
        ),
        BluetoothLEDevice::GetDeviceSelectorFromConnectionStatus(
            BluetoothConnectionStatus::Connected,
        ),
    ];
    let mut names = Vec::new();
    let mut succeeded = 0;
    for selector in selectors.into_iter().flatten() {
        let Ok(operation) = DeviceInformation::FindAllAsyncAqsFilter(&selector) else {
            continue;
        };
        let Ok(devices) = operation.get() else {
            continue;
        };
        let Ok(count) = devices.Size() else { continue };
        succeeded += 1;
        let count = count.min(200);
        for index in 0..count {
            if let Ok(device) = devices.GetAt(index) {
                if let Ok(name) = device.Name() {
                    let name = name.to_string();
                    if !name.trim().is_empty() && !names.contains(&name) {
                        names.push(name);
                    }
                }
            }
        }
    }
    if succeeded != 2 {
        return Err("Bluetooth device information is unavailable".into());
    }
    names.sort_unstable_by_key(|name| name.to_lowercase());
    Ok(names)
}
#[tauri::command]
pub async fn widget_bluetooth(window: tauri::Window) -> Result<Vec<String>, String> {
    if window.label() != "desktop-dock" && window.label() != "widget-sys_bluetooth" {
        return Err("Bluetooth information unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(bluetooth_devices)
        .await
        .map_err(|_| "Bluetooth request failed".to_string())?
}
