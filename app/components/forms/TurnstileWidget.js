"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Script from "next/script";

// Renders the Cloudflare Turnstile widget plus a submit button gated on the
// widget's verification result and the form's pending status. Uses Turnstile's
// explicit render API (not implicit auto-scan), so it remounts correctly after
// Server Action redirects / soft navigations.
export default function TurnstileWidget({
  siteKey,
  label = "Submit",
  pendingLabel = "Submitting...",
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const buttonWrapperRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [activated, setActivated] = useState(false);
  const { pending } = useFormStatus();

  // Defer loading the Turnstile script + mounting the widget until the user interacts with the form
  useEffect(() => {
    if (activated || !buttonWrapperRef.current) return;
    const form = buttonWrapperRef.current.closest("form");
    if (!form) return;

    function handleFirstInteraction() {
      setActivated(true);
    }

    form.addEventListener("focusin", handleFirstInteraction, { once: true });
    return () => form.removeEventListener("focusin", handleFirstInteraction);
  }, [activated]);

  useEffect(() => {
    if (!activated) return;
    let cancelled = false;
    let pollHandle;

    function tryRender() {
      if (cancelled || !containerRef.current) return;
      if (!window.turnstile) {
        pollHandle = setTimeout(tryRender, 100);
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: () => setStatus("verified"),
        "error-callback": () => setStatus("error"),
        "expired-callback": () => setStatus("expired"),
        "timeout-callback": () => setStatus("error"),
      });
    }

    tryRender();

    return () => {
      cancelled = true;
      if (pollHandle) clearTimeout(pollHandle);
      // Check widgetIdRef.current to avoid calling turnstile.remove before the widget is rendered
      // Check containerRef.current.isConnected to avoid calling turnstile.remove on an element that has been removed from the DOM
      if (widgetIdRef.current && window.turnstile && containerRef.current?.isConnected) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget already gone — ignore
        }
      }
    };
  }, [activated, siteKey]);

  const verified = status === "verified";
  const disabled = !activated || !verified || pending;

  return (
    <>
      {activated ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            async
            defer
          />
          <div className="flex">
            <div ref={containerRef} />
          </div>
        </>
      ) : null}
      <div ref={buttonWrapperRef}>
        <button type="submit" disabled={disabled} className={"btn-primary"}>
          {pending ? pendingLabel : label}
        </button>
      </div>
    </>
  );
}
