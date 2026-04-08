// User Profile Component

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/app/components/CurrentUserId";


export default function ProfileClient() {
  const router = useRouter();
  const { userId, loading: userLoading } = useCurrentUserId();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  // redirects to home page once logged out
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      // wait until we have pulled the user ID
      if (userLoading) {
        return;
      }

      setLoading(true);
      setError("");

      // No user ID = not signed in, return with null vals
      if (!userId) {
        setSignedIn(false);
        setProfile(null);
        setAdmin(false);
        setLoading(false);
        return;
      }

      // otherwise signed in
      setSignedIn(true);

      // grab the user data for this userId
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!active) {
        return;
      }

      // error loading user despite there being a userId, reutrn error
      if (userError || !userRow) {
        setError(userError?.message || "Could not load your profile.");
        setProfile(null);
        setAdmin(false);
        setLoading(false);
        return;
      }

      // Successful profile load
      setProfile(userRow);

      if (userRow.is_admin === true) {
        setAdmin(true);
      }
      else {
        setAdmin(false);
      }

      // done, no longer loading
      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router, userId, userLoading]);

  // Screens

  // profile still loading either in userId component or here 
  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold m-4">Profile</h1>
        <p className="text-sm text-gray-600">Loading profile...</p>
      </div>
    );
  }

  // User is not signed in or there was an error loading the profile
  if (!profile) {
    return (
      <div className="relative w-full mx-auto mt-20 px-4 text-center justify-center items-center">
          <h1 className="text-black text-4xl font-bold mb-10">Profile</h1>
        {signedIn ? (
          <div className="mt-6">
              <p className="text-sm text-red-600">{error || "Profile not found."}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded bg-black px-4 py-2 text-white cursor-pointer
                hover:bg-gray-800 transition focus-visible:bg-gray-800 
                active:scale-95 active:bg-gray-800 active:shadow-lg"
              >
                Log Out
              </button>
            </div>
        ) : (
          <>
            <p className="text-sm text-gray-700">You are not logged in.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded bg-black px-4 py-2 text-white cursor-pointer
                hover:bg-gray-800 transition focus-visible:bg-gray-800 
                active:scale-95 active:bg-gray-800 active:shadow-lg"
              >
                Log In
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Normal user
  if (!admin) {
    return (
      <div>
        <main>
          <div className="relative w-full mx-auto mt-20 mb-10 px-4 text-center justify-center items-center">
            <h1 className="text-black text-4xl font-bold">Profile</h1>
          </div>

          <div className="container mx-auto px-4 justify-center text-center">
            <div className="space-y-2">
              <p><span className="font-semibold">Name:</span> {profile.name || "Not provided"}</p>
              <p><span className="font-semibold">Email:</span> {profile.email || "Not provided"}</p>
              <p><span className="font-semibold">Phone:</span> {profile.phone || "Not provided"}</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded bg-black px-4 py-2 text-white cursor-pointer
                hover:bg-gray-800 transition focus-visible:bg-gray-800 
                active:scale-95 active:bg-gray-800 active:shadow-lg"
              >
                Log Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  } 

  // admin
  else {
    return (
      <div>
        <main>
          <div className="relative w-full mx-auto mt-20 mb-10 px-4 text-center justify-center items-center">
            <h1 className="text-black text-4xl font-bold">Profile</h1>
          </div>

          <div className="container mx-auto px-4 justify-center text-center">
            <div className="space-y-2 mb-6">
              <p><span className="font-semibold">Name:</span> {profile.name || "Not provided"}</p>
              <p><span className="font-semibold">Email:</span> {profile.email || "Not provided"}</p>
              <p><span className="font-semibold">Phone:</span> {profile.phone || "Not provided"}</p>
            </div>
            <div label="Actions" className="flex gap-4 justify-center w-full mb-4 mt-50">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded bg-blue-950 px-4 py-2 text-white cursor-pointer
                hover:bg-blue-900 transition focus-visible:bg-blue-900 
                active:scale-95 active:bg-blue-900 active:shadow-lg"
              >
                Dashboard
              </button>
              <div className="">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded bg-black px-4 py-2 text-white cursor-pointer
                  hover:bg-gray-800 transition focus-visible:bg-gray-800 
                  active:scale-95 active:bg-gray-800 active:shadow-lg"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
}
