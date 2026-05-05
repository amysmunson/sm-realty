// Provides a way to track unsaved changes in components and prompt user before navigating away if there are unsaved changes. 
// Prevents multiple prompts of previous implementation by centralizing the unsaved state management and handlers

"use client";

// Determines if the target url is the same as the current url
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

// Prompt user if they try to navigate away with unsaved changes. Covers browser-level navigation like closing tab
function handleBeforeUnload(event) {
  // Check for unsaved changes
  if (components.size === 0) {
    return;
  }

  // Trigger the leaving page confirmation
  event.preventDefault();
  event.returnValue = "";
}

// Prompt user if they try to navigate away with unsaved changes by clicking a link. Covers in-app navigation
function handleDocumentClick(event) {
  // Check for unsaved changes
  if (components.size === 0) {
    return;
  }
  // If the event target isn't an element, don't do anything
  if (!(event.target instanceof Element)) {
    return;
  }

  // Find the closest anchor tag to the click target
  const anchor = event.target.closest("a[href]");
  if (!anchor) {
    return;
  }

  // Don't prompt if the link is meant to open in a new tab or if modifier keys are pressed to open in a new tab
  if (anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  // Get the href attribute of the anchor tag. If it's empty or just a hash, don't prompt
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return;
  }

  // Don't prompt if the link is the same location
  if (isSameLocation(anchor)) {
    return;
  }

  // If there is already an unsaved confirmation active, don't trigger another one
  if (window.__unsavedConfirmActive) {
    return;
  }

  // Prompt the user about unsaved changes. If they choose to stay, prevent the default link navigation
  try {
    window.__unsavedConfirmActive = true;
    const shouldLeave = window.confirm("You have unsaved changes. Leave without saving?");
    if (!shouldLeave) {
      event.preventDefault();
    }
  } finally {
    // Reset the confirmation active flag after the prompt is handled to allow future prompts
    window.__unsavedConfirmActive = false;
  }
}

// Attach listeners for beforeunload and click events to handle unsaved change prompts
function installHandlers() {
  // Don't install handlers in non-browser environments or if they are already installed
  if (typeof window === "undefined" || handlersInstalled) {
    return;
  }
  window.addEventListener("beforeunload", handleBeforeUnload);
  document.addEventListener("click", handleDocumentClick, true);
  handlersInstalled = true;
}

// Remove the event listeners when there are no more unsaved components
function removeHandlers() {
  // Don't remove handlers in non-browser environments or if they aren't installed
  if (typeof window === "undefined" || !handlersInstalled) {
    return;
  }
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("click", handleDocumentClick, true);
  handlersInstalled = false;
}

// Set that a component has unsaved changes
export function setComponentUnsaved(id, has) {
  if (typeof window === "undefined") {
    return;
  }

  // If the component has unsaved changes, add it to the map and install handlers if this is the first unsaved component
  if (has) {
    components.set(id, true);
    installHandlers();
  }
  // If the component doesn't have unsaved changes, remove it from the map and remove handlers if there are no more unsaved components
  else {
    components.delete(id);
    if (components.size === 0) {
      removeHandlers();
    }
  }
}

// Clear all unsaved states for all components
export function clearAllUnsaved() {
  components.clear();
  removeHandlers();
}
