import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const MarketingContext = createContext(null);
const BASE = '/api/marketing';

export function MarketingProvider({ children }) {
  const qc = useQueryClient();

  const inv = (...keys) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['mkt-dashboard'],
    queryFn: () => apiRequest('GET', `${BASE}/dashboard`),
  });

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['mkt-assets'],
    queryFn: () => apiRequest('GET', `${BASE}/assets?limit=100`),
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['mkt-categories'],
    queryFn: () => apiRequest('GET', `${BASE}/categories`),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['mkt-audit'],
    queryFn: () => apiRequest('GET', `${BASE}/audit-logs`),
  });

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['mkt-notifications'],
    queryFn: () => apiRequest('GET', `${BASE}/notifications`),
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['mkt-reports'],
    queryFn: () => apiRequest('GET', `${BASE}/reports`),
  });

  const dashboard    = dashboardData?.data    || {};
  const assets       = assetsData?.data       || [];
  const categories   = categoriesData?.data   || [];
  const auditLogs    = auditData?.data        || [];
  const notifications = notifData?.data       || [];
  const reports      = reportsData?.data      || {};

  // Mutations
  const uploadAssetMut    = useMutation({ mutationFn: (fd) => apiRequest('POST', `${BASE}/assets`, fd), onSuccess: () => inv('mkt-assets', 'mkt-dashboard', 'mkt-audit', 'mkt-notifications') });
  const updateAssetMut    = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/assets/${id}`, data), onSuccess: () => inv('mkt-assets', 'mkt-audit') });
  const deleteAssetMut    = useMutation({ mutationFn: (id) => apiRequest('DELETE', `${BASE}/assets/${id}`), onSuccess: () => inv('mkt-assets', 'mkt-dashboard', 'mkt-audit') });
  const shareAssetMut     = useMutation({ mutationFn: ({ id, data }) => apiRequest('POST', `${BASE}/assets/${id}/share`, data), onSuccess: () => inv('mkt-assets', 'mkt-dashboard', 'mkt-audit') });
  const createCategoryMut = useMutation({ mutationFn: (data) => apiRequest('POST', `${BASE}/categories`, data), onSuccess: () => inv('mkt-categories') });
  const updateCategoryMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/categories/${id}`, data), onSuccess: () => inv('mkt-categories') });
  const deleteCategoryMut = useMutation({ mutationFn: (id) => apiRequest('DELETE', `${BASE}/categories/${id}`), onSuccess: () => inv('mkt-categories', 'mkt-assets') });

  const uploadAsset    = useCallback((fd) => uploadAssetMut.mutateAsync(fd), []);
  const updateAsset    = useCallback((id, data) => updateAssetMut.mutateAsync({ id, data }), []);
  const deleteAsset    = useCallback((id) => deleteAssetMut.mutateAsync(id), []);
  const shareAsset     = useCallback((id, data) => shareAssetMut.mutateAsync({ id, data }), []);
  const createCategory = useCallback((data) => createCategoryMut.mutateAsync(data), []);
  const updateCategory = useCallback((id, data) => updateCategoryMut.mutateAsync({ id, data }), []);
  const deleteCategory = useCallback((id) => deleteCategoryMut.mutateAsync(id), []);

  const refetchAssets = useCallback((params) => {
    qc.invalidateQueries({ queryKey: ['mkt-assets'] });
  }, [qc]);

  return (
    <MarketingContext.Provider value={{
      dashboard, dashboardLoading,
      assets, assetsLoading,
      categories, categoriesLoading,
      auditLogs, auditLoading,
      notifications, notifLoading,
      reports, reportsLoading,
      uploadAsset, updateAsset, deleteAsset, shareAsset,
      createCategory, updateCategory, deleteCategory,
      refetchAssets,
      uploadingAsset: uploadAssetMut.isPending,
    }}>
      {children}
    </MarketingContext.Provider>
  );
}

export function useMarketing() {
  const ctx = useContext(MarketingContext);
  if (!ctx) throw new Error('useMarketing must be used within MarketingProvider');
  return ctx;
}
