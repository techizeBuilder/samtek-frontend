import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/trainingApi'; // Adjust the import path

// ==========================================
// 1. TRAINEE MANAGEMENT HOOKS
// ==========================================

export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['adminDashboard'],
    queryFn: api.getAdminDashboard,
  });
};

// --- CERTIFICATE HOOK ---
// --- CERTIFICATE PREVIEW HOOK ---
export const useViewCertificate = () => {
  return useMutation({
    mutationFn: api.downloadCertificate,
    onSuccess: (blob) => {
      // 1. Create a fake URL for the PDF Blob
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      
      // 2. Open it in a new browser tab
      window.open(url, '_blank');
      
      // Note: We don't revoke the URL immediately here so the new tab has time to load it.
    },
    onError: (error) => {
      console.error("Certificate View Error:", error);
      alert("Failed to load the certificate. Please check your connection.");
    }
  });
};

// --- Queries ---

export const useAvailableTrainees = () => {
  return useQuery({
    queryKey: ['availableTrainees'],
    queryFn: api.getAvailableTrainees,
  });
};

export const useActiveTrainees = (filters?: any) => {
  return useQuery({
    queryKey: ['activeTrainees', filters],
    queryFn: () => api.getActiveTrainees(filters),
  });
};

export const useTraineeDetails = (id: string) => {
  return useQuery({
    queryKey: ['traineeDetails', id],
    queryFn: () => api.getTraineeDetails(id),
    enabled: !!id, 
  });
};

// --- Mutations ---

export const useStageCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string; assignedModules: string[] }) => api.stageCandidate(payload),
    onSuccess: () => {
      // Refresh both the available list (removes them) and active list (adds them)
      queryClient.invalidateQueries({ queryKey: ['availableTrainees'] });
      queryClient.invalidateQueries({ queryKey: ['activeTrainees'] });
    },
  });
};

export const useUpdateTraineeModules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedModules }: { id: string; assignedModules: string[] }) => 
      api.updateTraineeModules(id, assignedModules),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['traineeDetails', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['activeTrainees'] });
    },
  });
};

export const useFinalizeTrainee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'hire' | 'reject' }) => 
      api.finalizeTrainee(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTrainees'] });
    },
  });
};

export const useDeleteTraineeRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTraineeRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTrainees'] });
    },
  });
};


// ==========================================
// 2. MODULE MANAGEMENT HOOKS
// ==========================================

// --- Queries ---

export const useModules = (filters?: any) => {
  return useQuery({
    queryKey: ['modules', filters],
    queryFn: () => api.getModules(filters),
  });
};

// --- Mutations ---

export const useCreateTrainingModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTrainingModule, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};

export const useUpdateTrainingModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateTrainingModule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};

export const useDeactivateModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deactivateModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};

export const useAddMediaToModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, formData }: { moduleId: string; formData: FormData }) => 
      api.addMediaToModule(moduleId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};

export const useRemoveMediaFromModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, contentId }: { moduleId: string; contentId: string }) =>
      api.removeMediaFromModule(moduleId, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};

export const useUpdateMediaWatchTime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, contentId, minWatchTime }: { moduleId: string; contentId: string; minWatchTime: number }) =>
      api.updateMediaWatchTime(moduleId, contentId, minWatchTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};


// ==========================================
// 3. QUESTION BANK HOOKS
// ==========================================

// --- Queries ---

export const useQuestions = (moduleId: string, filters?: any) => {
  return useQuery({
    queryKey: ['questions', moduleId, filters],
    queryFn: () => api.getQuestions(moduleId, filters),
    enabled: !!moduleId, 
  });
};

// --- Mutations ---

export const useAddQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, payload }: { moduleId: string; payload: any }) => 
      api.addQuestionToModule(moduleId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions', variables.moduleId] });
    },
  });
};

export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, payload }: { questionId: string; payload: any }) => 
      api.updateQuestion(questionId, payload),
    onSuccess: () => {
      // Invalidating the entire questions cache to be safe, 
      // or you could target the specific module if you pass moduleId
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
};



// ==========================================
// 4. PHASE 2: TRAINEE / CANDIDATE HOOKS
// ==========================================

export const useMyDashboard = () => {
  return useQuery({
    queryKey: ['myDashboard'],
    queryFn: api.getMyDashboard,
  });
};

export const useModuleLearningView = (moduleId: string) => {
  return useQuery({
    queryKey: ['moduleLearningView', moduleId],
    queryFn: () => api.getModuleLearningView(moduleId),
    enabled: !!moduleId, // Only fetch if we have a moduleId
  });
};

export const useModuleTestInfo = (moduleId: string) => {
  return useQuery({
    queryKey: ['moduleTestInfo', moduleId],
    queryFn: () => api.getModuleTestInfo(moduleId),
    enabled: !!moduleId,
  });
};

export const useMarkContentCompleted = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markContentCompleted,
    onSuccess: (_, variables) => {
      // Refresh the specific classroom view and the overall dashboard status
      queryClient.invalidateQueries({ queryKey: ['moduleLearningView', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['myDashboard'] });
    },
  });
};

export const useStartTest = () => {
  return useMutation({
    mutationFn: api.startTest,
    // Note: We don't necessarily invalidate here because we usually 
    // navigate straight into the active test view using the returned data.
  });
};

export const useSubmitTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitTest,
    onSuccess: () => {
      // Refresh dashboard to show the new Pass/Fail status and unlock the next sequence
      queryClient.invalidateQueries({ queryKey: ['myDashboard'] });
    },
  });
};