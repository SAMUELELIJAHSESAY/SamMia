import { useState } from 'react';
import { usePayrollPeriods, useCreatePayrollPeriod } from '../../hooks/useReports';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { formatDate, formatCurrency } from '../../lib/utils';
import { DollarSign, Calendar, Users, Calculator, FileText, CheckCircle } from 'lucide-react';

export function PayrollPage() {
  const { data: periods = [], isLoading } = usePayrollPeriods();
  const createPeriod = useCreatePayrollPeriod();
  const showToast = useUIStore((s) => s.showToast);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [newPeriod, setNewPeriod] = useState({ name: '', periodStart: '', periodEnd: '' });

  const handleCreate = async () => {
    if (!newPeriod.name || !newPeriod.periodStart || !newPeriod.periodEnd) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await createPeriod.mutateAsync({
        name: newPeriod.name,
        periodStart: newPeriod.periodStart,
        periodEnd: newPeriod.periodEnd,
      });
      showToast('Payroll period created', 'success');
      setShowCreateModal(false);
      setNewPeriod({ name: '', periodStart: '', periodEnd: '' });
    } catch (error: any) {
      showToast(error.message || 'Failed to create payroll period', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'processing': return <Badge variant="warning">Processing</Badge>;
      case 'approved': return <Badge variant="info">Approved</Badge>;
      default: return <Badge variant="neutral">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll</h1>
        <Button leftIcon={<DollarSign className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
          New Payroll Period
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {periods.map((period) => (
          <Card key={period.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedPeriod(period)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                {getStatusBadge(period.status)}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{period.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(period.period_start)} - {formatDate(period.period_end)}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {period.total_employees} employees
                  </span>
                  {period.total_net_pay > 0 && (
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(period.total_net_pay)}
                    </span>
                  )}
                </div>
              </div>
              {period.status === 'draft' && (
                <Button
                  size="sm"
                  className="w-full mt-3"
                  leftIcon={<Calculator className="w-4 h-4" />}
                  onClick={(e) => { e.stopPropagation(); handleProcess(period.id); }}
                >
                  Process Payroll
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPeriod && (
        <Modal
          isOpen={!!selectedPeriod}
          onClose={() => setSelectedPeriod(null)}
          title={selectedPeriod.name}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Employees</p>
                  <p className="text-2xl font-bold">{selectedPeriod.total_employees}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Net Pay</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedPeriod.total_net_pay)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center text-gray-400 py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Detailed payroll entries would be displayed here</p>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Payroll Period"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Period Name"
            value={newPeriod.name}
            onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
            placeholder="e.g., July 2024"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={newPeriod.periodStart} onChange={(e) => setNewPeriod({ ...newPeriod, periodStart: e.target.value })} />
            <Input label="End Date" type="date" value={newPeriod.periodEnd} onChange={(e) => setNewPeriod({ ...newPeriod, periodEnd: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
