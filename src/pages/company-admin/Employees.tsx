import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useCreateEmployee, useDepartments, useBranches } from '../../hooks/useCompany';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, Pagination } from '../../components/ui/Table';
import { getInitials, formatDate } from '../../lib/utils';
import { Search, Plus } from 'lucide-react';

export function EmployeesPage() {
  const navigate = useNavigate();
  const { data: employees, isLoading } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: branches } = useBranches();
  const createEmployee = useCreateEmployee();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff',
    branch_id: '',
    department_id: '',
    job_title: '',
    employee_id: '',
    hourly_rate: 0,
  });

  const filtered = employees?.filter((e) =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = async () => {
    try {
      await createEmployee.mutateAsync(newEmployee);
      setShowAddModal(false);
      setNewEmployee({
        email: '', password: '', full_name: '', role: 'staff',
        branch_id: '', department_id: '', job_title: '', employee_id: '', hourly_rate: 0,
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'inactive': return <Badge variant="neutral">Inactive</Badge>;
      case 'suspended': return <Badge variant="warning">Suspended</Badge>;
      case 'terminated': return <Badge variant="error">Terminated</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>ID</TableHeaderCell>
                    <TableHeaderCell>Department</TableHeaderCell>
                    <TableHeaderCell>Branch</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Joined</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((employee) => (
                    <TableRow key={employee.id} className="cursor-pointer" onClick={() => navigate(`/employees/${employee.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                            {getInitials(employee.full_name || '')}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{employee.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-gray-500">{employee.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.employee_id || '-'}</TableCell>
                      <TableCell>{(employee as any).department?.name || '-'}</TableCell>
                      <TableCell>{(employee as any).branch?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">{employee.role.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>{employee.hire_date ? formatDate(employee.hire_date) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filtered.length}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Employee"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={createEmployee.isPending}>Create Employee</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={newEmployee.full_name}
              onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Temporary Password"
              type="password"
              value={newEmployee.password}
              onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
              required
            />
            <Input
              label="Employee ID"
              value={newEmployee.employee_id}
              onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="branch_manager">Branch Manager</option>
                <option value="department_manager">Department Manager</option>
                <option value="company_admin">Company Admin</option>
              </select>
            </div>
            <Input
              label="Job Title"
              value={newEmployee.job_title}
              onChange={(e) => setNewEmployee({ ...newEmployee, job_title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch</label>
              <select
                value={newEmployee.branch_id}
                onChange={(e) => setNewEmployee({ ...newEmployee, branch_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">Select Branch</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
              <select
                value={newEmployee.department_id}
                onChange={(e) => setNewEmployee({ ...newEmployee, department_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">Select Department</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Hourly Rate"
            type="number"
            value={newEmployee.hourly_rate}
            onChange={(e) => setNewEmployee({ ...newEmployee, hourly_rate: Number(e.target.value) })}
          />
        </div>
      </Modal>
    </div>
  );
}
