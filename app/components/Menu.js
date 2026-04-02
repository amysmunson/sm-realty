"use client";

import { useState } from "react";
import Link from "next/link";

export default function Menu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-menu"
      >
        Menu
      </button>

      {open && (
        <>
          {/* Overlay backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 998,
            }}
          />
          {/* Menu panel */}
          <nav
            id="site-menu"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "white",
              padding: "40px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              zIndex: 999,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                alignSelf: "flex-end",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                marginBottom: "20px",
              }}
            >
              ✕
            </button>
            <Link href="/" onClick={() => setOpen(false)} style={{ fontSize: "18px" }}>Home</Link>
            <Link href="/properties" onClick={() => setOpen(false)} style={{ fontSize: "18px" }}>Properties</Link>
            <Link href="/about" onClick={() => setOpen(false)} style={{ fontSize: "18px" }}>About</Link>
            <Link href="/contact" onClick={() => setOpen(false)} style={{ fontSize: "18px" }}>Contact</Link>
          </nav>
        </>
      )}
    </>
  );
}