import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/complaintApi';

// ==========================================
// QUERIES (Fetching Data)
// ==========================================

export const useCustomerHistory = (mobileNumber: string) => {
  return useQuery({
    queryKey: ['customerHistory', mobileNumber],
    queryFn: () => api.getCustomerHistory(mobileNumber),
    // Only fire the request if the mobile number is exactly 10 digits
    enabled: !!mobileNumber && mobileNumber.length === 10,
    retry: false, // Don't retry on 404 (new customers won't have history)
  });
};

export const useServicemen = (status?: string, zone?: string) => {
  return useQuery({
    queryKey: ['servicemen', status, zone],
    queryFn: () => api.getServicemen(status, zone),
  });
};

export const useSupportTickets = (filters: any) => {
  return useQuery({
    queryKey: ['supportTickets', filters],
    queryFn: () => api.getSupportTickets(filters),
  });
};

export const useTicketDetails = (id: string) => {
  return useQuery({
    queryKey: ['ticketDetails', id],
    queryFn: () => api.getTicketDetails(id),
    enabled: !!id,
  });
};

export const useMyTickets = (filters: any) => {
  return useQuery({
    queryKey: ['myTickets', filters],
    queryFn: () => api.getMyTickets(filters),
  });
};

// ==========================================
// MUTATIONS (Changing Data)
// ==========================================

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
    },
  });
};

export const useAssignTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.assignTicket(id, payload),
    onSuccess: (_, variables) => {
      // Instantly refresh the main table AND the specific detail view
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails', variables.id] });
    },
  });
};

export const useCancelTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.cancelTicket(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails', variables.id] });
    },
  });
};

//  NEW: Hook for Dispatcher sending the email
export const useSendVerificationEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sendVerificationEmail(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails', id] });
    },
  });
};

//  NEW: Hook for Customer submitting response
export const useVerifyCustomerResponse = () => {
  return useMutation({
    mutationFn: ({ token, payload }: { token: string; payload: any }) => api.verifyCustomerResponse(token, payload)
  });
};

// --- TECHNICIAN MUTATIONS ---

export const useStartVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.startVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails'] });
    },
  });
};

export const useCompleteVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => api.completeVisit(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketDetails'] });
    },
  });
};

export const useUpdateTechnician = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateTechnician(id, payload),
    onSuccess: () => {
      // Invalidate the serviceman list so the UI refreshes with new data
      queryClient.invalidateQueries({ queryKey: ['servicemen'] });
    },
  });
};