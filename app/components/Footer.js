"use client";

import Link from "next/link";


export default function Footer() {
    return (
        <footer className="text-left p-4 text-sm text-white bg-blue-950">
            <div className="m-15 mb-10">
                <Link href="/properties" onClick={() => setOpen(false)} className="block mb-5">
                    Properties
                </Link>
                <Link href="/about" onClick={() => setOpen(false)} className="block mb-5">
                    About
                </Link>
                <Link href="/contact" onClick={() => setOpen(false)} className="block mb-5">
                    Contact
                </Link>
            </div>
        </footer> 
    )
}