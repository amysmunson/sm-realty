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
        className="text-white text-xl font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>

      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/50 z-998 transition-all duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Menu */}
      <nav
        id="site-menu"
        className={`fixed top-0 right-0 sm:w-90vw w-75 max-w-sm h-screen overflow-y-auto bg-white p-4 flex flex-col gap-4 z-999 shadow-xl items-center transform transition-all duration-300 ease-out ${
          open
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-80"
        }`}
      >
        {/* Exit button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="self-end text-lg m-1 cursor-pointer text-gray-800"
        >
          ✕
        </button>

        {/* Menu links */}
        <Link href="/" onClick={() => setOpen(false)} className="text-2xl font-medium text-gray-800">
          Home
        </Link>
        <Link href="/properties" onClick={() => setOpen(false)} className="text-2xl font-medium text-gray-800">
          Properties
        </Link>
        <Link href="/about" onClick={() => setOpen(false)} className="text-2xl font-medium text-gray-800">
          About
        </Link>
        <Link href="/contact" onClick={() => setOpen(false)} className="text-2xl font-medium text-gray-800">
          Contact
        </Link>
      </nav>
    </>
  );
}