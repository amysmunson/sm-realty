"use client";

import { useEffect, useRef, useState } from "react";

// Renders the Cloudflare Turnstile widget AND a submit button whose state is
// gated on the widget's verification result. Uses Turnstile's explicit render
// API (not implicit auto-scan), so it remounts correctly after Server Action
// redirects / soft navigations.
export default function TurnstileWidget({ siteKey, label = "Submit" }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
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
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget already gone — ignore
        }
      }
    };
  }, [siteKey]);

  const verified = status === "verified";

  return (
    <>
      <div className="flex justify-center">
        <div ref={containerRef} />
      </div>
      <div>
        <button
          type="submit"
          disabled={!verified}
          className={`inline-flex items-center px-4 py-2 
            border border-transparent rounded-sm shadow-sm 
            text-sm font-medium text-white 
            focus:outline-none focus:ring-1 focus:ring-offset-1 transition 
            disabled:opacity-50 disabled:cursor-default disabled:hover:bg-blue-950
            bg-blue-950 hover:bg-blue-900 focus:ring-blue-950 cursor-pointer`}
        >
          {label}
        </button>
      </div>
    </>
  );
}
