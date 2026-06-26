import { useState } from 'react';
import { useQRCodes, useCreateQRCode, useDeleteQRCode } from '../../hooks/useQRCode';
import { useBranches } from '../../hooks/useCompany';
import { QRCodeDisplay } from '../../components/qr/QRCodeDisplay';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { Plus, Trash2, MapPin, Clock, QrCode } from 'lucide-react';

export function QRCodesPage() {
  const { data: qrCodes, isLoading } = useQRCodes();
  const { data: branches } = useBranches();
  const createQR = useCreateQRCode();
  const deleteQR = useDeleteQRCode();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [newQR, setNewQR] = useState({
    name: '',
    branchId: '',
    type: 'permanent',
    maxUses: '',
    gpsRequired: true,
    geofenceRequired: false,
    allowedRadius: 100,
  });

  const handleCreate = async () => {
    try {
      await createQR.mutateAsync({
        name: newQR.name,
        branchId: newQR.branchId || undefined,
        type: newQR.type,
        maxUses: newQR.maxUses ? parseInt(newQR.maxUses) : undefined,
        gpsRequired: newQR.gpsRequired,
        geofenceRequired: newQR.geofenceRequired,
        allowedRadiusMeters: newQR.allowedRadius,
      });
      setShowAddModal(false);
      setNewQR({ name: '', branchId: '', type: 'permanent', maxUses: '', gpsRequired: true, geofenceRequired: false, allowedRadius: 100 });
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Codes</h1>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Generate QR Code
        </Button>
      </div>

      {selectedQR ? (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelectedQR(null)}>← Back to List</Button>
          <QRCodeDisplay qrCode={selectedQR} />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All QR Codes</CardTitle>
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
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Branch</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Uses</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qrCodes?.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell className="font-medium">{qr.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{qr.code}</code>
                      </TableCell>
                      <TableCell>{(qr as any).branch?.name || 'All Branches'}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">{qr.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={qr.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {qr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{qr.use_count}{qr.max_uses ? ` / ${qr.max_uses}` : ''}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<QrCode className="w-4 h-4" />}
                            onClick={() => setSelectedQR(qr)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
                            onClick={() => {
                              if (confirm('Delete this QR code?')) {
                                deleteQR.mutate(qr.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Generate New QR Code"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={createQR.isPending}>Generate</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newQR.name}
            onChange={(e) => setNewQR({ ...newQR, name: e.target.value })}
            placeholder="e.g., Main Entrance"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch</label>
            <select
              value={newQR.branchId}
              onChange={(e) => setNewQR({ ...newQR, branchId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">All Branches</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={newQR.type}
                onChange={(e) => setNewQR({ ...newQR, type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
                <option value="one_time">One Time</option>
              </select>
            </div>
            <Input
              label="Max Uses (optional)"
              type="number"
              value={newQR.maxUses}
              onChange={(e) => setNewQR({ ...newQR, maxUses: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newQR.gpsRequired}
                onChange={(e) => setNewQR({ ...newQR, gpsRequired: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Require GPS</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newQR.geofenceRequired}
                onChange={(e) => setNewQR({ ...newQR, geofenceRequired: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Require Geofence</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
