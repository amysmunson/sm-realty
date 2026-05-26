// User Profile Component

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurrentUserId } from "@/lib/useCurrentUserId";


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
      <div className="container-page-small">
        <main className="flex flex-col flex-none">
          <div className="profile-heading-container">
            <h1 className="heading-page">Profile</h1>
          </div>
          <div className="profile-body-container">
            <p className="text-sm text-gray-600">Loading profile...</p>
          </div>
        </main>
        <div className="flex-1" />
      </div>
    );
  }

  // User is not signed in or there was an error loading the profile
  if (!profile) {
    return (
      <div className="container-page-small">
        <main className="flex flex-col flex-none">
          <div className="profile-heading-container">
            <h1 className="heading-page">Profile</h1>
          </div>
          <div className="profile-body-container">
            {signedIn ? (
              <div className="flex flex-col items-center gap-6">
                <p className="text-sm text-red-600">{error || "Profile not found."}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2 btn-delete"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <p className="text-sm text-gray-700">You are not logged in.</p>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="btn-primary"
                >
                  Log In
                </button>
                {/* </div> */}
              </div>
            )}
          </div>
        </main>
        <div className="flex-1" />
      </div>
    );
  }

  // Normal user
  if (!admin) {
    return (
      <div className="container-page-small">
        <main className="flex flex-col flex-none">
          <div className="absolute top-18 right-4">
            <button
              type="button"
              onClick={handleLogout}
              className="px-2 btn-delete"
            >
              Log Out
            </button>
          </div>

          <div className="profile-heading-container">
            <h1 className="heading-page">Profile</h1>
          </div>

          <div className="profile-body-container">
            <div className="space-y-2">
              <p><span className="font-semibold">Name:</span> {profile.name || "Not provided"}</p>
              <p><span className="font-semibold">Email:</span> {profile.email || "Not provided"}</p>
              <p><span className="font-semibold">Phone:</span> {profile.phone || "Not provided"}</p>
            </div>
          </div>
        </main>
        <div className="flex-1" />
      </div>
    );
  }

  // admin
  else {
    return (
      <div className="container-page-small">
        <main className="flex flex-col flex-none">
          <div className="absolute top-18 right-4">
            <button
              type="button"
              onClick={handleLogout}
              className="px-2 btn-delete"
            >
              Log Out
            </button>
          </div>

          <div className="profile-heading-container">
            <h1 className="heading-page">Profile</h1>
          </div>

          <div className="profile-body-container">
            <div className="space-y-2 mb-6">
              <p><span className="font-semibold">Name:</span> {profile.name || "Not provided"}</p>
              <p><span className="font-semibold">Email:</span> {profile.email || "Not provided"}</p>
              <p><span className="font-semibold">Phone:</span> {profile.phone || "Not provided"}</p>
            </div>
            <div className="flex gap-4 justify-center w-full mt-16 mb-8">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="btn-primary"
              >
                Dashboard
              </button>
            </div>
          </div>
        </main>
        <div className="flex-1" />
      </div>
    );
  }
}
