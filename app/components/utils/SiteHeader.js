// Side header and navigation bar component across each site
// At this time, an opaque header matching the color scheme with a clear header when over the homepage photo
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Menu from "./Menu";

export default function SiteHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(!isHomePage);

  useEffect(() => {
    // If this is not the homepage, just set it to the opaque
    if (!isHomePage) {
      setIsScrolled(true);
      return;
    }

    // Listen to scroll events and update the header style once you scroll past a certain point
    function handleScroll() {
      setIsScrolled(window.scrollY > 120);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHomePage]);

  // Definition of the header class and style based on whether it's the homepage and whether the user has scrolled
  const headerClassName = isHomePage
    ? "fixed inset-x-0 top-0 z-50 transition-[background-color,background-image] duration-500 ease-out"
    : "relative z-50 bg-blue-950 border-b border-blue-950";

  // This is using rgba for smoother opacity transition, something to revisit
  const headerStyle = isHomePage
    ? {
      backgroundColor: isScrolled ? "rgba(23, 37, 84, 1)" : "rgba(23, 37, 84, 0)",
      backgroundImage: isScrolled
        ? "none"
        : "linear-gradient(to bottom, rgba(23, 37, 84, 0.96) 0%, rgba(23, 37, 84, 0.78) 18%, rgba(23, 37, 84, 0.42) 42%, rgba(23, 37, 84, 0) 100%)",
      backgroundBlendMode: isScrolled ? "normal" : "multiply",
      boxShadow: isScrolled ? "0 8px 24px rgba(0, 0, 0, 0.12)" : "none",
    }
    : undefined;

  return (
    <header className={headerClassName} style={headerStyle}>
      <div className="flex items-center justify-between p-4 transition-colors duration-200 py-2">
        {/* Logo/Site Name */}
        <Link className="text-white text-xl font-medium drop-shadow-sm" href="/">
          Shen Munson Realty
        </Link>
        {/* Navigation and Menu */}
        {/* Only show the text links on med+ screens */}
        <div className="hidden md:flex items-center space-x-4 gap-8">
          <Link href="/properties" className="text-white text-lg font-medium mr-4">
            Properties
          </Link>
          <Link href="/about" className="text-white text-lg font-medium mr-4">
            About
          </Link>
          <Link href="/contact" className="text-white text-lg font-medium mr-4">
            Contact
          </Link>
          <Menu />
        </div>
        {/* Always show the menu icon on smaller screens */}
        <div className="md:hidden">
          <Menu />
        </div>
      </div>
    </header>
  );
}