import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

async function fetchCloudData<T>(key: string, userId: string): Promise<T | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action: "get", key, userId }),
      }
    );
    if (!response.ok) return null;
    const result = await response.json();
    return result.value ?? null;
  } catch {
    return null;
  }
}

async function saveCloudData<T>(key: string, value: T, userId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action: "save", key, value, userId }),
      }
    );
  } catch (e) {
    console.error("Error saving cloud data:", e);
  }
}

export function useUserData<T>(key: string, defaultValue: T) {
  const { isAuthenticated, currentUser } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load data from cloud on mount/user change
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setIsLoaded(false);
      fetchCloudData<T>(key, currentUser).then((cloudValue) => {
        if (cloudValue !== null) {
          setData(cloudValue);
        }
        setIsLoaded(true);
      });
    } else {
      setData(defaultValue);
      setIsLoaded(false);
    }
  }, [isAuthenticated, currentUser, key]);

  const updateData = useCallback(
    (newData: T | ((prev: T) => T)) => {
      setData((prev) => {
        const nextData = typeof newData === "function"
          ? (newData as (prev: T) => T)(prev)
          : newData;

        if (isAuthenticated && currentUser) {
          // Debounce cloud saves to avoid excessive requests
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            saveCloudData(key, nextData, currentUser);
          }, 500);
        }

        return nextData;
      });
    },
    [key, isAuthenticated, currentUser]
  );

  return { data, updateData, isLoaded };
}
