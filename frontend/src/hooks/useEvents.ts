/**
 * Hook: Real-time event streaming via Soroban RPC getEvents.
 * Provides an activity feed driven entirely by the event stream.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToEvents, ActivityEntry } from '@/lib/soroban';

export function useEvents() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startStreaming = useCallback(() => {
    // Clean up previous subscription before creating new one
    const prev = unsubscribeRef.current;
    if (prev) {
      unsubscribeRef.current = null;
      prev();
    }
    setIsStreaming(true);
    setError(null);

    const unsubscribe = subscribeToEvents(
      (event) => {
        setActivities((prev) => {
          // Keep only the latest 50 events
          const updated = [event, ...prev];
          return updated.slice(0, 50);
        });
      },
      (err) => {
        setError(`Event stream disconnected: ${err.message}`);
        setIsStreaming(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
  }, []);

  const stopStreaming = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    startStreaming();
    return () => {
      stopStreaming();
    };
  }, [startStreaming, stopStreaming]);

  return {
    activities,
    error,
    isStreaming,
    retry: startStreaming,
  };
}
