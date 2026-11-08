use std::cell::RefCell;
use windows::{
    core::{Interface, Result},
    Foundation::Numerics::Vector2,
    System::{DispatcherQueue, DispatcherQueueController},
    UI::Composition::{Compositor, CompositionRoundedRectangleGeometry, SpriteVisual, Desktop::DesktopWindowTarget},
    Win32::{Foundation::{BOOL, HWND}, Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_USE_HOSTBACKDROPBRUSH},
        System::WinRT::{CreateDispatcherQueueController, DispatcherQueueOptions, DQTYPE_THREAD_CURRENT, DQTAT_COM_STA, Composition::ICompositorDesktopInterop}},
};

#[allow(dead_code)]
struct Glass {
    hwnd: isize,
    _compositor: Compositor,
    _target: DesktopWindowTarget,
    visual: SpriteVisual,
    geometry: CompositionRoundedRectangleGeometry,
}

thread_local! {
    static QUEUE: RefCell<Option<DispatcherQueueController>> = const { RefCell::new(None) };
    static GLASS: RefCell<Option<Glass>> = const { RefCell::new(None) };
}

pub fn clear() {
    GLASS.with(|slot| {
        if let Some(g) = slot.borrow_mut().take() {
            let _ = g._target.SetRoot(None);
            let handle = HWND(g.hwnd as _);
            let disabled = BOOL(0);
            let _ = unsafe {
                DwmSetWindowAttribute(
                    handle,
                    DWMWA_USE_HOSTBACKDROPBRUSH,
                    &disabled as *const _ as _,
                    std::mem::size_of_val(&disabled) as u32,
                )
            };
        }
    });
}

#[allow(dead_code)]
pub fn update(hwnd: isize, width: f32, height: f32, radius: f32) -> Result<()> {
    QUEUE.with(|slot| -> Result<()> {
        if slot.borrow().is_none() && DispatcherQueue::GetForCurrentThread().is_err() {
            *slot.borrow_mut() = Some(unsafe { CreateDispatcherQueueController(DispatcherQueueOptions {
                dwSize: std::mem::size_of::<DispatcherQueueOptions>() as u32,
                threadType: DQTYPE_THREAD_CURRENT, apartmentType: DQTAT_COM_STA,
            })? });
        }
        Ok(())
    })?;
    GLASS.with(|slot| -> Result<()> {
        let mut glass = slot.borrow_mut();
        if glass.as_ref().map(|g| g.hwnd) != Some(hwnd) {
            glass.take();
            let handle = HWND(hwnd as _);
            let enabled = BOOL(1);
            unsafe { DwmSetWindowAttribute(handle, DWMWA_USE_HOSTBACKDROPBRUSH,
                &enabled as *const _ as _, std::mem::size_of_val(&enabled) as u32)?; }
            let compositor = Compositor::new()?;
            let interop: ICompositorDesktopInterop = compositor.cast()?;
            let target = unsafe { interop.CreateDesktopWindowTarget(handle, true)? };
            let visual = compositor.CreateSpriteVisual()?;
            visual.SetBrush(&compositor.CreateHostBackdropBrush()?)?;
            let geometry = compositor.CreateRoundedRectangleGeometry()?;
            visual.SetClip(&compositor.CreateGeometricClipWithGeometry(&geometry)?)?;
            target.SetRoot(&visual)?;
            *glass = Some(Glass { hwnd, _compositor: compositor, _target: target, visual, geometry });
        }
        let g = glass.as_ref().unwrap();
        let size = Vector2 { X: width.max(0.), Y: height.max(0.) };
        let radius = radius.max(0.).min(size.X / 2.).min(size.Y / 2.);
        g.geometry.SetSize(size)?;
        g.geometry.SetCornerRadius(Vector2 { X: radius, Y: radius })?;
        g.visual.SetSize(size)?;
        Ok(())
    })
}
