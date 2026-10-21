import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Filters } from '@/types';

export const DEFAULT_FILTERS: Filters = {
  ageRange: [18, 40],
  distance: 25,
  gender: [],
  fitnessLevel: [],
  diet: [],
  languages: [],
  activityLevel: [],
  interests: [],
  goals: [],
  bodyType: [],
  height: [],
};

type FiltersContextValue = {
  filters: Filters;
  draftFilters: Filters;
  setDraftFilters: (filters: Filters) => void;
  beginEditing: () => void;
  applyDraftFilters: () => void;
  resetDraftFilters: () => void;
  resetFilters: () => void;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const value = useMemo(
    () => ({
      filters,
      draftFilters,
      setDraftFilters,
      beginEditing: () => setDraftFilters(cloneFilters(filters)),
      applyDraftFilters: () => setFilters(cloneFilters(draftFilters)),
      resetDraftFilters: () => setDraftFilters(cloneFilters(DEFAULT_FILTERS)),
      resetFilters: () => {
        setFilters(cloneFilters(DEFAULT_FILTERS));
        setDraftFilters(cloneFilters(DEFAULT_FILTERS));
      },
    }),
    [filters, draftFilters]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

function cloneFilters(filters: Filters): Filters {
  return {
    ...filters,
    ageRange: [...filters.ageRange],
    gender: [...filters.gender],
    fitnessLevel: [...filters.fitnessLevel],
    diet: [...filters.diet],
    languages: [...filters.languages],
    activityLevel: [...filters.activityLevel],
    interests: [...filters.interests],
    goals: [...filters.goals],
    bodyType: [...filters.bodyType],
    height: [...filters.height],
  };
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFilters must be used inside FiltersProvider');
  return context;
}
