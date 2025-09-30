'use client';

import { cacheService } from '@/services/cache-service';
import { useEffect, useState } from 'react';

export function useCacheInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeCache = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await cacheService.initializeAll();

        if (isMounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize cache:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
          setIsInitialized(true); // Still set to true to prevent infinite loading
        }
      }
    };

    initializeCache();

    // Cleanup function
    return () => {
      isMounted = false;
      cacheService.cleanup();
    };
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
  };
}
