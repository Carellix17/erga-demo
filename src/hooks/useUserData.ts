import { useState, useCallback, useEffect } from "react";
import { getUserData, saveUserData } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

export function useUserData<T>(key: string, defaultValue: T) {
  const { isAuthenticated, currentUser } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data when user changes or on mount
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const storedData = getUserData(key, defaultValue);
      setData(storedData);
      setIsLoaded(true);
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
        
        if (isAuthenticated) {
          saveUserData(key, nextData);
        }
        
        return nextData;
      });
    },
    [key, isAuthenticated]
  );

  return { data, updateData, isLoaded };
}
