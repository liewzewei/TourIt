import { useEffect, useState } from "react";

import { AuthError, Session, User } from "@supabase/supabase-js";

import createClient from "@/lib/supabase/client";

export default function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      try {
        // Fetch the current session and user data from Supabase
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        
        // If a session exists, set the session and user state
        if (session) {
          setSession(session);
          setUser(session.user);
          // Fetch the user's profile from the database
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profileError) throw profileError;
          setProfile(profileData);
        }
      } catch (error) {
        setError(error as AuthError);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [supabase]);

  return { loading, error, session, user, profile };
}