/**
 * The desktop sidebar can collapse to an icon rail. The choice lives in
 * localStorage and is mirrored onto <html data-nav-collapsed> by a tiny
 * pre-paint script, so CSS lays the rail out correctly before hydration.
 */
export const NAV_COLLAPSED_STORAGE_KEY = "primoria:nav-collapsed";
export const NAV_COLLAPSE_EVENT = "primoria:nav-collapse";

export const NAV_COLLAPSE_BOOTSTRAP_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(NAV_COLLAPSED_STORAGE_KEY)})==="1")document.documentElement.dataset.navCollapsed="true"}catch(e){}`;
