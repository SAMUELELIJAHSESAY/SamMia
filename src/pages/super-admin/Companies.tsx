import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Building2, Plus, Trash2, Edit, Shield, Mail, Lock } from 'lucide-react';

interface CreateAdminForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function CompaniesPage() {
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    plan: 'free',
  });
  const [adminForm, setAdminForm] = useState<CreateAdminForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Fetch all companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['allCompanies', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase.from('companies').select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createCompany = useMutation({
    mutationFn: async (payload: any) => {
      const slug = payload.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: payload.name,
          slug,
          email: payload.email,
          phone: payload.phone,
          industry: payload.industry,
          plan_id: payload.plan,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          max_employees: payload.plan === 'free' ? 5 : payload.plan === 'pro' ? 50 : 500,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('company_settings').insert({
        company_id: data.id,
        work_start_time: '09:00',
        work_end_time: '17:00',
        break_duration_minutes: 60,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCompanies'] });
      showToast('Company created successfully', 'success');
      setShowCreateCompanyModal(false);
      setNewCompany({ name: '', email: '', phone: '', industry: '', plan: 'free' });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create company', 'error');
    },
  });

  const createCompanyAdmin = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) throw new Error('No company selected');

      // Validate form
      if (!adminForm.fullName || !adminForm.email || !adminForm.password) {
        throw new Error('Please fill in all fields');
      }

      if (adminForm.password !== adminForm.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (adminForm.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminForm.email,
        password: adminForm.password,
        email_confirm: true,
        user_metadata: {
          full_name: adminForm.fullName,
        },
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          company_id: selectedCompanyId,
          email: adminForm.email,
          full_name: adminForm.fullName,
          role: 'company_admin',
          status: 'active',
        });

      if (profileError) throw profileError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCompanies'] });
      showToast('Admin user created successfully', 'success');
      setShowCreateAdminModal(false);
      setAdminForm({ fullName: '', email: '', password: '', confirmPassword: '' });
      setSelectedCompanyId(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create admin user', 'error');
    },
  });

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.email) {
      showToast('Please fill in required fields', 'error');
      return;
    }
    await createCompany.mutateAsync(newCompany);
  };

  const handleCreateAdmin = async () => {
    await createCompanyAdmin.mutateAsync();
  };

  const openCreateAdminModal = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setAdminForm({ fullName: '', email: '', password: '', confirmPassword: '' });
    setShowCreateAdminModal(true);
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateCompanyModal(true)}>
          Add Company
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          aria-label="Filter by status"
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Plan</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No companies found
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company: any) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary-600" />
                          {company.name}
                        </TableCell>
                        <TableCell>{company.email}</TableCell>
                        <TableCell>
                          <Badge variant="neutral" size="sm">{company.plan_id}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(company.status)} size="sm">
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(company.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              leftIcon={<Shield className="w-4 h-4" />}
                              onClick={() => openCreateAdminModal(company.id)}
                              title="Create Admin User"
                            >
                              Add Admin
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Company Modal */}
      <Modal
        isOpen={showCreateCompanyModal}
        onClose={() => setShowCreateCompanyModal(false)}
        title="Create New Company"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateCompanyModal(false)}>Cancel</Button>
            <Button onClick={handleCreateCompany} disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Company Name *"
            value={newCompany.name}
            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
            placeholder="Acme Corporation"
          />
          <Input
            label="Email *"
            type="email"
            value={newCompany.email}
            onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
            placeholder="admin@acme.com"
          />
          <Input
            label="Phone"
            value={newCompany.phone}
            onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
          <Input
            label="Industry"
            value={newCompany.industry}
            onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
            placeholder="Technology"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
            <select
              value={newCompany.plan}
              onChange={(e) => setNewCompany({ ...newCompany, plan: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="free">Free (5 employees)</option>
              <option value="pro">Pro (50 employees)</option>
              <option value="enterprise">Enterprise (500+ employees)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Create Admin User Modal */}
      <Modal
        isOpen={showCreateAdminModal}
        onClose={() => setShowCreateAdminModal(false)}
        title="Create Company Admin"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateAdminModal(false)}>Cancel</Button>
            <Button onClick={handleCreateAdmin} disabled={createCompanyAdmin.isPending}>
              {createCompanyAdmin.isPending ? 'Creating...' : 'Create Admin'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
            <p className="text-sm text-primary-700 dark:text-primary-300 font-medium">
              Creating admin for: <span className="font-bold">{companies.find(c => c.id === selectedCompanyId)?.name}</span>
            </p>
          </div>
          <Input
            label="Full Name *"
            value={adminForm.fullName}
            onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
            placeholder="John Doe"
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Email Address *"
            type="email"
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            placeholder="admin@company.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Password *"
            type="password"
            value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />
          <Input
            label="Confirm Password *"
            type="password"
            value={adminForm.confirmPassword}
            onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />
          <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-3">
            <p className="text-xs text-warning-700 dark:text-warning-300">
              ⚠️ Password must be at least 8 characters. Share these credentials securely with the admin.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
