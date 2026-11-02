"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/libs/apiClient";

/**
 * Fetches the business type for a given tenant slug.
 * Slug is required — without it the API call would 404.
 *
 * @param {string} slug - Tenant slug from useParams() or route params.
 * @param {string} defaultType - Fallback value while loading.
 */
export default function useBusinessType(slug, defaultType = "restaurant") {
  const [businessType, setBusinessType] = useState(defaultType);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchBusinessConfig = async () => {
      try {
        const data = await apiGet(`/api/${slug}/business`);
        if (isMounted && data?.type) {
          setBusinessType(String(data.type).toLowerCase());
        }
      } catch (err) {
        console.error("Error cargando configuración de negocio:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBusinessConfig();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { businessType, isLoading, error };
}
