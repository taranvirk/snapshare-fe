/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import PropTypes from "prop-types";

const AuthContext = createContext(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xoqvsbyhxetxxlfkhspo.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXZzYnloeGV0eHhsZmtoc3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ1NDY3ODYsImV4cCI6MjAzMDEyMjc4Nn0.PPpPdS1EhJ9EO3lRgjYIVcVp9EqYgFhQGsv5dGqMyuk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.error("Unable to restore the Supabase session:", error);
        if (mounted) setUser(data.session?.user ?? null);
      })
      .catch((error) => console.error("Unable to restore the Supabase session:", error))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, signOut }), [signOut, user]);

  if (loading) {
    return <div className="app-loader" role="status" aria-label="Loading Snapshare"><span className="brand-mark brand-mark--pulse">S</span></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
