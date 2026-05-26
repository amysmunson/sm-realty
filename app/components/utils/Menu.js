"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileButton from "./ProfileButton";

export default function Menu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-menu"
        className="inline-flex h-10 w-10 items-center justify-center text-white cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>

      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/50 z-998 transition-all duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      />

      {/* Menu */}
      <nav
        id="site-menu"
        className={`fixed top-0 right-0 w-[90vw] sm:w-105 max-w-md h-dvh overflow-y-auto bg-blue-950 p-4 flex flex-col gap-4 z-999 shadow-xl items-center transform transition-all duration-300 ease-out ${open
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-80"
          }`}
      >
        {/* Exit button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="self-end text-lg m-1 cursor-pointer text-white hover:font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>

        </button>

        {/* Menu links */}
        <div className="menu-link-list">
          <Link href="/" onClick={() => setOpen(false)} className="menu-link pt-0">
            Home
          </Link>
          <Link href="/properties" onClick={() => setOpen(false)} className="menu-link">
            Properties
          </Link>
          <Link href="/about" onClick={() => setOpen(false)} className="menu-link">
            About
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)} className="menu-link">
            Contact
          </Link>
        </div>
        <div className="text-white hover:font-bold mt-auto">
          <ProfileButton onClick={() => setOpen(false)} />
        </div>
      </nav>
    </>
  );
}
