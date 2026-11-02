'use client';
import { createContext, useContext } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ tenantConfig, children }) {
  return (
    <TenantContext.Provider value={tenantConfig}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantConfig() {
  return useContext(TenantContext);
}

export default TenantContext;
