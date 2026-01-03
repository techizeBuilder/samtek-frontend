import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Plus, Search, Edit, Trash2, Eye, Cog } from 'lucide-react';

export default function Manufacturing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data: jobsData, isLoading } = useQuery({
    queryKey: [`/api/manufacturing?page=${page}&limit=10&search=${search}&status=${status}`],
    enabled: true
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId) => api.delete(`/manufacturing/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing'] });
      toast({
        title: "Success",
        description: "Manufacturing job deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete manufacturing job",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'In Progress':
        return 'status-in-progress';
      case 'Completed':
        return 'status-completed';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteJob = (jobId) => {
    if (window.confirm('Are you sure you want to delete this manufacturing job?')) {
      deleteJobMutation.mutate(jobId);
    }
  };

  const jobs = jobsData?.jobs || [];
  const pagination = jobsData?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Cog className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-semibold">Manufacturing</h1>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Manufacturing Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search manufacturing jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Cog className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No manufacturing jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Job Number</th>
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Progress</th>
                    <th className="text-left py-3 px-4 font-medium">Efficiency</th>
                    <th className="text-left py-3 px-4 font-medium">Start Date</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{job.jobNumber}</td>
                      <td className="py-3 px-4">{job.productName}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {job.actualQuantity}/{job.plannedQuantity}
                          </span>
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${Math.min((job.actualQuantity / job.plannedQuantity) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {job.efficiency ? `${job.efficiency}%` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(job.startDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteJob(job._id)}
                            disabled={deleteJobMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} jobs
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
