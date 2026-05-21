// This component provides a navigation bar for edit pages with a Back link and a Save All button 
// Uses MutationObserver to track changes in the DOM and determine if there are any pending saves, enabling or disabling the Save All button accordingly

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Helper functions to determine if a button should trigger a save, check for active saving buttons, and wait for saving to settle before allowing another save or navigation
function shouldTriggerSave(button) {
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    return false;
  }

  // Exclude buttons within the EditNavigationBar
  if (button.closest("[data-edit-navigation-bar='true']")) {
    return false;
  }

  // Check if the button text indicates it's a save button. Falls back to
  // aria-label so icon-only buttons (e.g. the property row save) are matched
  // by their accessible name when textContent is empty.
  const text = (button.textContent || button.getAttribute("aria-label") || "").trim().toLowerCase();
  return text === "save" || text === "save order";
}

// Check if there are any active saving buttons on the page
function hasActiveSavingButtons() {
  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.some((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }

    const text = (button.textContent || button.getAttribute("aria-label") || "").trim().toLowerCase();
    return text.includes("saving");
  });
}

// Wait for all saving actions to settle before allowing another save or navigation with a timeout
function waitForSavingToSettle(timeoutMs = 12000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (!hasActiveSavingButtons() || Date.now() - start >= timeoutMs) {
        window.clearInterval(timer);
        resolve();
      }
    }, 250);
  });
}

// Count the number of pending save buttons to determine if there are unsaved changes
function countPendingSaveButtons() {
  return Array.from(document.querySelectorAll("button")).filter(shouldTriggerSave).length;
}

export default function EditNavigationBar() {
  const [savingAndLeaving, setSavingAndLeaving] = useState(false);
  const [hasPendingSaves, setHasPendingSaves] = useState(false);
  const observerRef = useRef(null);

  // Trigger click on all save buttons and wait for saving to settle before allowing navigation, with a check for any remaining unsaved changes after waiting
  async function saveAll() {
    if (savingAndLeaving) {
      return;
    }

    setSavingAndLeaving(true);

    const saveButtons = Array.from(document.querySelectorAll("button")).filter(shouldTriggerSave);

    saveButtons.forEach((button) => {
      button.click();
    });

    await waitForSavingToSettle();

    const pendingSaves = countPendingSaveButtons();
    if (pendingSaves > 0) {
      window.alert(
        "Some rows may still be unsaved. Please review sections that still show an enabled Save button."
      );
    }

    setSavingAndLeaving(false);
  }

  // Use MutationObserver to track changes in the DOM and determine if there are any pending saves, enabling or disabling the Save All button accordingly
  useEffect(() => {
    function update() {
      try {
        setHasPendingSaves(countPendingSaveButtons() > 0);
      } catch (e) {
        // ignore
      }
    }

    update();

    if (typeof MutationObserver !== "undefined") {
      observerRef.current = new MutationObserver(() => {
        update();
      });
      observerRef.current.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    } else {
      const id = window.setInterval(update, 500);
      observerRef.current = { disconnect: () => window.clearInterval(id) };
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return (
    <div data-edit-navigation-bar="true" className="flex flex-wrap items-center justify-start gap-4">
      <Link
        href={"/dashboard"}
        className="rounded border border-blue-950 bg-white px-4 py-2 text-sm font-semibold text-blue-950"
      >
        Back
      </Link>
      <button
        type="button"
        onClick={saveAll}
        disabled={savingAndLeaving || !hasPendingSaves}
        className="rounded bg-blue-950 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save All
      </button>
    </div>
  );
}