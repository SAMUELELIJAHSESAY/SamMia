import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useEmployeeInvite } from '../../hooks/useMultiTenant';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { Mail, Plus, Trash2 } from 'lucide-react';

export function EmployeeInvitesPage() {
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const inviteEmployee = useEmployeeInvite();

  const [newInvite, setNewInvite] = useState({
    fullName: '',
    email: '',
    role: 'staff',
    branchId: '',
    departmentId: '',
    salary: '',
  });

  // Fetch pending invites
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['employeeInvites', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', user?.company_id)
        .eq('status', 'invited');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', user?.company_id);
      if (error) throw error;
      return data || [];
    },
  });

  const handleInvite = async () => {
    if (!newInvite.fullName || !newInvite.email) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      await inviteEmployee.mutateAsync({
        companyId: user!.company_id,
        fullName: newInvite.fullName,
        email: newInvite.email,
        role: newInvite.role,
        branchId: newInvite.branchId || undefined,
        departmentId: newInvite.departmentId || undefined,
        salary: newInvite.salary ? parseFloat(newInvite.salary) : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['employeeInvites'] });
      setShowInviteModal(false);
      setNewInvite({
        fullName: '',
        email: '',
        role: 'staff',
        branchId: '',
        departmentId: '',
        salary: '',
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invite Employees</h1>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowInviteModal(true)}>
          Send Invite
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite: any) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.full_name}</TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning" size="sm">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-4 h-4" />}>
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Employee"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteEmployee.isPending}>
              {inviteEmployee.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={newInvite.fullName}
            onChange={(e) => setNewInvite({ ...newInvite, fullName: e.target.value })}
            placeholder="John Doe"
            required
          />

          <Input
            label="Email"
            type="email"
            value={newInvite.email}
            onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
            placeholder="john@company.com"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={newInvite.role}
              onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="staff">Staff Member</option>
              <option value="branch_manager">Branch Manager</option>
              <option value="department_manager">Department Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch (Optional)</label>
            <select
              value={newInvite.branchId}
              onChange={(e) => setNewInvite({ ...newInvite, branchId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Select Branch</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Monthly Salary (Optional)"
            type="number"
            value={newInvite.salary}
            onChange={(e) => setNewInvite({ ...newInvite, salary: e.target.value })}
            placeholder="5000"
          />
        </div>
      </Modal>
    </div>
  );
}
