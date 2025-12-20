import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Production API Hooks
export const useProductionDashboard = () => {
  return useQuery({
    queryKey: ['productionDashboard'],
    queryFn: async () => {
      const response = await fetch('/api/production/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch production dashboard data');
      }
      
      return response.json();
    }
  });
};

export const useBatchPlans = () => {
  return useQuery({
    queryKey: ['batchPlans'],
    queryFn: async () => {
      const response = await fetch('/api/production/batch-plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch plans');
      }
      
      return response.json();
    }
  });
};

export const useCreateBatchPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planData) => {
      const response = await fetch('/api/production/batch-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(planData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create batch plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchPlans'] });
    }
  });
};

export const useUpdateBatchPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await fetch(`/api/production/batch-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update batch plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchPlans'] });
    }
  });
};

export const useApproveBatchPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planId) => {
      const response = await fetch(`/api/production/batch-plans/${planId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve batch plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchPlans'] });
    }
  });
};

export const useProductionBatches = () => {
  return useQuery({
    queryKey: ['productionBatches'],
    queryFn: async () => {
      const response = await fetch('/api/production/batches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch production batches');
      }
      
      return response.json();
    }
  });
};

export const useCreateProductionBatch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (batchData) => {
      const response = await fetch('/api/production/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(batchData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create production batch');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['productionDashboard'] });
    }
  });
};

export const useUpdateProductionBatch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await fetch(`/api/production/batches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update production batch');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['productionDashboard'] });
    }
  });
};

export const useProductionRecords = () => {
  return useQuery({
    queryKey: ['productionRecords'],
    queryFn: async () => {
      const response = await fetch('/api/production/records', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch production records');
      }
      
      return response.json();
    }
  });
};

export const useCreateProductionRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recordData) => {
      const response = await fetch('/api/production/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(recordData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create production record');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionRecords'] });
      queryClient.invalidateQueries({ queryKey: ['productionDashboard'] });
    }
  });
};

export const usePendingVerifications = () => {
  return useQuery({
    queryKey: ['pendingVerifications'],
    queryFn: async () => {
      const response = await fetch('/api/production/verifications/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending verifications');
      }
      
      return response.json();
    }
  });
};

export const useVerifyProduction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, verificationData }) => {
      const response = await fetch(`/api/production/verify/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(verificationData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify production');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingVerifications'] });
      queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      queryClient.invalidateQueries({ queryKey: ['productionDashboard'] });
    }
  });
};

// Reports hooks
export const useProductionReports = (params = {}) => {
  return useQuery({
    queryKey: ['productionReports', params],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      console.log('Fetching production reports with params:', params);
      
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/production/reports?${queryString}`;
      
      console.log('API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      const data = await response.json();
      console.log('Production reports data:', data);
      return data;
    },
    enabled: !!localStorage.getItem('authToken'), // Only run if token exists
    retry: 1
  });
};