use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show sgChat", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;

    let status_online = MenuItem::with_id(app, "status_online", "Online", true, None::<&str>)?;
    let status_idle = MenuItem::with_id(app, "status_idle", "Idle", true, None::<&str>)?;
    let status_dnd = MenuItem::with_id(app, "status_dnd", "Do Not Disturb", true, None::<&str>)?;
    let status_invisible =
        MenuItem::with_id(app, "status_invisible", "Invisible", true, None::<&str>)?;
    let status_menu = Submenu::with_items(
        app,
        "Status",
        true,
        &[
            &status_online,
            &status_idle,
            &status_dnd,
            &status_invisible,
        ],
    )?;

    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit sgChat", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &separator,
            &status_menu,
            &settings,
            &separator2,
            &quit,
        ],
    )?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("sgChat")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap_or_default();
                    window.set_focus().unwrap_or_default();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide().unwrap_or_default();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap_or_default();
                    window.set_focus().unwrap_or_default();
                }
            }
        })
        .build(app)?;

    Ok(())
}
