"use client";

function isSameLocation(anchor) {
  try {
    const nextUrl = new URL(anchor.href, window.location.href);
    const currentUrl = new URL(window.location.href);
    return (
      nextUrl.origin === currentUrl.origin &&
      nextUrl.pathname === currentUrl.pathname &&
      nextUrl.search === currentUrl.search &&
      nextUrl.hash === currentUrl.hash
    );
  } catch (e) {
    return false;
  }
}

const components = new Map();
let handlersInstalled = false;

function handleBeforeUnload(event) {
  if (components.size === 0) return;
  event.preventDefault();
  event.returnValue = "";
}

function handleDocumentClick(event) {
  if (components.size === 0) return;
  if (!(event.target instanceof Element)) return;

  const anchor = event.target.closest("a[href]");
  if (!anchor) return;

  if (anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return;

  if (isSameLocation(anchor)) return;

  if (window.__unsavedConfirmActive) return;

  try {
    window.__unsavedConfirmActive = true;
    const shouldLeave = window.confirm("You have unsaved changes. Leave without saving?");
    if (!shouldLeave) {
      event.preventDefault();
    }
  } finally {
    window.__unsavedConfirmActive = false;
  }
}

function installHandlers() {
  if (typeof window === "undefined" || handlersInstalled) return;
  window.addEventListener("beforeunload", handleBeforeUnload);
  document.addEventListener("click", handleDocumentClick, true);
  handlersInstalled = true;
}

function removeHandlers() {
  if (typeof window === "undefined" || !handlersInstalled) return;
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("click", handleDocumentClick, true);
  handlersInstalled = false;
}

export function setComponentUnsaved(id, has) {
  if (typeof window === "undefined") return;

  if (has) {
    components.set(id, true);
    installHandlers();
  } else {
    components.delete(id);
    if (components.size === 0) {
      removeHandlers();
    }
  }
}

export function clearAllUnsaved() {
  components.clear();
  removeHandlers();
}
