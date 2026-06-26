import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Mail, Plus, Edit2 } from 'lucide-react';

const defaultTemplates = [
  {
    id: 'leave_approval',
    name: 'Leave Approval',
    subject: 'Your leave request has been {{STATUS}}',
    body: 'Your leave request for {{START_DATE}} to {{END_DATE}} has been {{STATUS}}.',
  },
  {
    id: 'leave_rejection',
    name: 'Leave Rejection',
    subject: 'Your leave request has been rejected',
    body: 'Your leave request for {{START_DATE}} to {{END_DATE}} has been rejected.\n\nReason: {{REASON}}',
  },
  {
    id: 'payroll_processed',
    name: 'Payroll Processed',
    subject: 'Your payroll for {{PERIOD}} has been processed',
    body: 'Your payroll for {{PERIOD}} has been processed.\n\nNet Amount: {{NET_SALARY}}',
  },
  {
    id: 'employee_invited',
    name: 'Employee Invitation',
    subject: 'You have been invited to {{COMPANY_NAME}}',
    body: 'You have been invited to join {{COMPANY_NAME}}.\n\nTemporary Password: {{TEMP_PASSWORD}}\n\nPlease change your password on first login.',
  },
];

export function EmailTemplatesPage() {
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplates[0]);
  const [formData, setFormData] = useState(defaultTemplates[0]);

  const { data: customTemplates = [], isLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (template: any) => {
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          id: template.id,
          name: template.name,
          subject: template.subject,
          body: template.body,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      showToast('Template saved successfully', 'success');
      setShowEditModal(false);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to save template', 'error');
    },
  });

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setFormData(template);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    await updateTemplate.mutateAsync(formData);
  };

  const allTemplates = [...defaultTemplates, ...customTemplates];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage notification email templates</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          allTemplates.map((template: any) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  {customTemplates.find((t: any) => t.id === template.id) && (
                    <Badge variant="info" size="sm">Custom</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {template.subject}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 break-words">
                    {template.body}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  leftIcon={<Edit2 className="w-4 h-4" />}
                  onClick={() => handleEdit(template)}
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Template: ${selectedTemplate.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Leave Approval"
            required
          />

          <Input
            label="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Email subject line"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono min-h-[200px]"
              placeholder="Email body (use {{VARIABLE}} for placeholders)"
              required
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">Available Variables:</p>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p>{{EMPLOYEE_NAME}} - Employee's full name</p>
              <p>{{START_DATE}} - Leave start date</p>
              <p>{{END_DATE}} - Leave end date</p>
              <p>{{REASON}} - Rejection/approval reason</p>
              <p>{{PERIOD}} - Payroll period</p>
              <p>{{NET_SALARY}} - Net salary amount</p>
              <p>{{COMPANY_NAME}} - Company name</p>
              <p>{{TEMP_PASSWORD}} - Temporary password</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
