"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfileButton({ onClick }) {
  const router = useRouter();

  // Redirect according to session and if user is logged in already
  async function profileClick() {

    // close the menu if it's open
    if (onClick) {
      onClick();
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      router.push("/profile");
      return;
    }

    // Redirect when you are not logged in to a login page
    router.push("/login");
  }

  return (
    <>
      <button
        type="button"
        onClick={profileClick}
        className="text-current text-xl font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 cursor-pointer">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>

      </button>

    </>
  );
}