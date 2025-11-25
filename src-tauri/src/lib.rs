use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Build tray menu
            let show_main = MenuItemBuilder::with_id("show_main", "Show Vault-er").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let menu = MenuBuilder::new(app).items(&[&show_main, &quit]).build()?;

            // Create tray icon
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show_main" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("dropzone") {
                            let is_visible = window.is_visible().unwrap_or(false);

                            if is_visible {
                                let _ = window.hide();
                            } else {
                                // Calculate position before showing
                                if let Ok(Some(monitor)) = window.current_monitor() {
                                    let scale_factor = monitor.scale_factor();
                                    let window_size = window.outer_size().unwrap_or_default();

                                    let rect_position =
                                        rect.position.to_physical::<f64>(scale_factor);
                                    let rect_size = rect.size.to_physical::<f64>(scale_factor);

                                    // Center horizontally: Icon X + (Icon Width / 2) - (Window Width / 2)
                                    let icon_center_x = rect_position.x + (rect_size.width / 2.0);
                                    let mut x = icon_center_x - (window_size.width as f64 / 2.0);

                                    // Clamp to monitor bounds
                                    let monitor_size = monitor.size();
                                    let monitor_pos = monitor.position();

                                    let monitor_width = monitor_size.width as f64;
                                    let monitor_x = monitor_pos.x as f64;

                                    // Right edge check
                                    if x + window_size.width as f64 > monitor_x + monitor_width {
                                        x = monitor_x + monitor_width
                                            - window_size.width as f64
                                            - 12.0; // 12px padding from edge
                                    }

                                    // Left edge check
                                    if x < monitor_x {
                                        x = monitor_x + 12.0;
                                    }

                                    // Position vertically: Below the icon
                                    let y = rect_position.y + rect_size.height;

                                    let _ = window.set_position(tauri::Position::Physical(
                                        tauri::PhysicalPosition {
                                            x: x as i32,
                                            y: y as i32,
                                        },
                                    ));
                                }

                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
