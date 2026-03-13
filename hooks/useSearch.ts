// ─────────────────────────────────────────────────────────────
// hooks/useSearch.ts
// Smart search state: debounce, sections, recent searches,
// loading/error. Zero business logic in the component.
// ─────────────────────────────────────────────────────────────
import { OSLO_DEFAULT } from "@/hooks/useLocation";
import { searchAll, type SearchResult, type SearchResultType } from "@/services/supabase/search";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

// Re-export core search result types so UI components can import from one place.
export type { SearchResult, SearchResultType } from "@/services/supabase/search";

const STORAGE_KEY    = "@thirdplace:recent_searches";
const MAX_RECENTS    = 8;
const DEBOUNCE_MS    = 300;

export interface SearchSection {
  type:    SearchResultType;
  label:   string;
  results: SearchResult[];
}

const SECTION_META: Record<SearchResultType, { label: string; order: number }> = {
  experience: { label: "Experiences", order: 0 },
  person:     { label: "People",      order: 1 },
  place:      { label: "Places",      order: 2 },
};

function groupIntoSections(results: SearchResult[]): SearchSection[] {
  const map = new Map<SearchResultType, SearchResult[]>();
  for (const r of results) {
    if (!map.has(r.result_type)) map.set(r.result_type, []);
    map.get(r.result_type)!.push(r);
  }
  return [...map.entries()]
    .sort((a, b) => SECTION_META[a[0]].order - SECTION_META[b[0]].order)
    .map(([type, items]) => ({
      type,
      label:   SECTION_META[type].label,
      results: items,
    }));
}

interface SearchState {
  query:         string;
  sections:      SearchSection[];
  recentSearches: string[];
  isLoading:     boolean;
  isActive:      boolean;   // true when search bar is focused
  error:         string | null;
}

interface SearchActions {
  setQuery:        (q: string) => void;
  activate:        () => void;
  deactivate:      () => void;
  selectRecent:    (q: string) => void;
  removeRecent:    (q: string) => void;
  clearQuery:      () => void;
}

interface SearchCoords {
  latitude:  number;
  longitude: number;
}

export function useSearch(coords: SearchCoords | null): SearchState & SearchActions {
  const [query,          setQueryState]   = useState("");
  const [sections,       setSections]     = useState<SearchSection[]>([]);
  const [recentSearches, setRecents]      = useState<string[]>([]);
  const [isLoading,      setIsLoading]    = useState(false);
  const [isActive,       setIsActive]     = useState(false);
  const [error,          setError]        = useState<string | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Load recents from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setRecents(JSON.parse(raw) as string[]);
      })
      .catch(() => {/* ignore */});
  }, []);

  const persistRecents = useCallback(async (next: string[]) => {
    setRecents(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addToRecents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    const trimmed = q.trim();
    setRecents((prev) => {
      const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Core search — debounced
  const runSearch = useCallback((q: string, lat: number, lng: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAll(q, lat, lng);
        if (requestIdRef.current !== requestId) return; // stale
        setSections(groupIntoSections(results));
        setError(null);
      } catch (e) {
        if (requestIdRef.current !== requestId) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setSections([]);
      } finally {
        if (requestIdRef.current === requestId) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    const lat = coords?.latitude  ?? OSLO_DEFAULT.latitude;
    const lng = coords?.longitude ?? OSLO_DEFAULT.longitude;
    runSearch(q, lat, lng);
  }, [coords, runSearch]);

  const activate = useCallback(() => setIsActive(true), []);

  const deactivate = useCallback(() => {
    setIsActive(false);
    setQueryState("");
    setSections([]);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState("");
    setSections([]);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const selectRecent = useCallback((q: string) => {
    setQueryState(q);
    const lat = coords?.latitude  ?? OSLO_DEFAULT.latitude;
    const lng = coords?.longitude ?? OSLO_DEFAULT.longitude;
    runSearch(q, lat, lng);
  }, [coords, runSearch]);

  const removeRecent = useCallback((q: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r !== q);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Save to recents when the query produces results
  useEffect(() => {
    if (sections.length > 0 && query.trim()) {
      addToRecents(query);
    }
  }, [sections]);

  return {
    query, sections, recentSearches, isLoading, isActive, error,
    setQuery, activate, deactivate, selectRecent, removeRecent, clearQuery,
  };
}
