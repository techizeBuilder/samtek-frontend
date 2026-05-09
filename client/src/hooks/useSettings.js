import { useQuery } from '@tanstack/react-query';

export function useSettings() {
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    settings: settingsData?.data,
    isLoading,
    // companyLogo: settingsData?.data?.company?.logo,
    // companyName: settingsData?.data?.company?.name || 'Samtek Machinery'
  };
}