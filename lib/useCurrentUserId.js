"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useCurrentUserId() {
  const [userId, setUserId] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFromSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(false);
      }

      setLoading(false);
    }

    loadFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(false);
      }

      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
}
