import { useState } from 'react';
import { useReports, useCreateReport } from '../../hooks/useReports';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/utils';
import { FileText, Download, Calendar, Filter, FileSpreadsheet, FileCode } from 'lucide-react';

export function ReportsPage() {
  const { data: reports = [], isLoading } = useReports();
  const createReport = useCreateReport();
  const showToast = useUIStore((s) => s.showToast);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'monthly',
    dateFrom: '',
    dateTo: '',
    format: 'pdf',
  });

  const handleGenerate = async () => {
    if (!newReport.name || !newReport.dateFrom || !newReport.dateTo) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await createReport.mutateAsync({
        name: newReport.name,
        reportType: newReport.type,
        dateFrom: newReport.dateFrom,
        dateTo: newReport.dateTo,
        format: newReport.format,
      });
      showToast('Report generated successfully', 'success');
      setShowGenerateModal(false);
      setNewReport({ name: '', type: 'monthly', dateFrom: '', dateTo: '', format: 'pdf' });
    } catch (error: any) {
      showToast(error.message || 'Failed to generate report', 'error');
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'csv': return <FileCode className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <Button leftIcon={<FileText className="w-4 h-4" />} onClick={() => setShowGenerateModal(true)}>
          Generate Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No reports generated yet. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getFormatIcon(report.format)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{report.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.date_from)} - {formatDate(report.date_to)}
                        </span>
                        <Badge variant="neutral" size="sm">{report.report_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={report.generated_at ? 'success' : 'warning'} 
                      size="sm"
                    >
                      {report.generated_at ? 'Ready' : 'Pending'}
                    </Badge>
                    {report.file_url && (
                      <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Report"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Report Name"
            value={newReport.name}
            onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
            placeholder="e.g., June 2024 Attendance"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
            <select
              value={newReport.type}
              onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Range</option>
              <option value="employee">Employee Report</option>
              <option value="payroll">Payroll Report</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="From" type="date" value={newReport.dateFrom} onChange={(e) => setNewReport({ ...newReport, dateFrom: e.target.value })} />
            <Input label="To" type="date" value={newReport.dateTo} onChange={(e) => setNewReport({ ...newReport, dateTo: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
            <div className="flex gap-3">
              {(['pdf', 'excel', 'csv'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setNewReport({ ...newReport, format })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    newReport.format === format
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {getFormatIcon(format)}
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
