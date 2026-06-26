import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/utils';
import { Calendar, CheckCircle, XCircle, Clock, User } from 'lucide-react';

export function LeavePage() {
  const { role, companyId, user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [newRequest, setNewRequest] = useState({
    startDate: '',
    endDate: '',
    leaveTypeId: '',
    reason: '',
    halfDay: false,
  });

  const isAdmin = ['company_admin', 'branch_manager', 'department_manager'].includes(role?.role || '');

  // Fetch leave requests
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaveRequests', companyId, isAdmin, user?.id],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employee_id(full_name, id),
          leave_type:leave_type_id(name, color)
        `)
        .eq('company_id', companyId);

      if (!isAdmin) {
        query = query.eq('employee_id', user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch leave types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const createLeave = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          company_id: companyId,
          employee_id: user?.id,
          leave_type_id: payload.leaveTypeId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          total_days: Math.ceil((new Date(payload.endDate).getTime() - new Date(payload.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
          reason: payload.reason,
          half_day: payload.halfDay,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      showToast('Leave request submitted', 'success');
      setShowRequestModal(false);
      setNewRequest({ startDate: '', endDate: '', leaveTypeId: '', reason: '', halfDay: false });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to submit leave request', 'error');
    },
  });

  const approveLeave = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      showToast('Leave approved', 'success');
    },
  });

  const rejectLeave = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      showToast('Leave rejected', 'info');
    },
  });

  const handleRequest = async () => {
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.leaveTypeId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    await createLeave.mutateAsync(newRequest);
  };

  const filtered = leaves.filter((l: any) => filter === 'all' || l.status === filter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Approved</Badge>;
      case 'rejected': return <Badge variant="error">Rejected</Badge>;
      default: return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
        <Button leftIcon={<Calendar className="w-4 h-4" />} onClick={() => setShowRequestModal(true)}>
          Request Leave
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No leave requests found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((leave: any) => (
            <Card key={leave.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                        {leave.employee?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{leave.employee?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{leave.leave_type?.name || 'Leave'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </span>
                      <span>{leave.total_days} days</span>
                    </div>
                    {leave.reason && <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">{leave.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(leave.status)}
                    {isAdmin && leave.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => approveLeave.mutate(leave.id)}
                        >
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => rejectLeave.mutate(leave.id)}
                        >
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Leave"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowRequestModal(false)}>Cancel</Button>
            <Button onClick={handleRequest} disabled={createLeave.isPending}>
              Submit Request
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
            <select
              value={newRequest.leaveTypeId}
              onChange={(e) => setNewRequest({ ...newRequest, leaveTypeId: e.target.value })}
              aria-label="Select leave type"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((lt: any) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={newRequest.startDate}
              onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={newRequest.endDate}
              onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <textarea
              value={newRequest.reason}
              onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[100px]"
              placeholder="Enter reason for leave..."
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newRequest.halfDay}
              onChange={(e) => setNewRequest({ ...newRequest, halfDay: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Half Day</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
