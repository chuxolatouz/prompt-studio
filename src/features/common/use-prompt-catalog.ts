'use client';

import {useCallback, useEffect, useState} from 'react';
import {loadPromptCatalog, getFallbackPromptCatalog} from '@/lib/catalog';

type CatalogLocale = 'es' | 'en';

export function usePromptCatalog(locale: CatalogLocale, options: {includeInactive?: boolean} = {}) {
  const [catalog, setCatalog] = useState(() => getFallbackPromptCatalog(locale));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadPromptCatalog(locale, options);
      setCatalog(next);
    } finally {
      setLoading(false);
    }
  }, [locale, options.includeInactive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...catalog,
    loading,
    refresh,
  };
}
