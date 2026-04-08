import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Sanitize text to prevent injection
function sanitizeText(value, maxLength = 200) {
  return String(value || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, maxLength);
}

// Normalize form fields with relevant rules
function normalizeEmail(value) {
  return sanitizeText(value, 320).toLowerCase();
}

function normalizePhone(value) {
  const phone = sanitizeText(value, 64);
  if (!phone) return null;
  return phone.replace(/[^0-9+()\-\s]/g, "").slice(0, 32);
}

// API route to handle user registration with validation and error handling
export async function POST(request) {
  try {
    if (!supabaseUrl || !supabasePublishableKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing." },
        { status: 500 }
      );
    }

    // Sanitize and normalize the form data
    const body = await request.json();
    const name = sanitizeText(body?.name, 120);
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || "").trim();
    const phone = normalizePhone(body?.phone);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabasePublishableKey);

    // Sign up call
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: data?.user?.id });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
