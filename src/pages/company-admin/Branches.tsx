import { useState } from 'react';
import { useBranches, useCreateBranch } from '../../hooks/useCompany';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Plus, MapPin, Building2 } from 'lucide-react';

export function BranchesPage() {
  const { data: branches } = useBranches();
  const createBranch = useCreateBranch();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    geofence_radius_meters: 100,
  });

  const handleCreate = async () => {
    try {
      await createBranch.mutateAsync({
        name: newBranch.name,
        code: newBranch.code || undefined,
        address: newBranch.address || undefined,
        city: newBranch.city || undefined,
        country: newBranch.country || undefined,
        latitude: newBranch.latitude ? parseFloat(newBranch.latitude) : undefined,
        longitude: newBranch.longitude ? parseFloat(newBranch.longitude) : undefined,
        geofence_radius_meters: newBranch.geofence_radius_meters,
      });
      setShowAddModal(false);
      setNewBranch({ name: '', code: '', address: '', city: '', country: '', phone: '', email: '', latitude: '', longitude: '', geofence_radius_meters: 100 });
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branches</h1>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Add Branch
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches?.map((branch) => (
          <Card key={branch.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge variant={branch.status === 'active' ? 'success' : 'neutral'}>
                  {branch.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{branch.name}</h3>
              {branch.code && <p className="text-xs text-gray-400 font-mono">{branch.code}</p>}
              {branch.address && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {branch.address}{branch.city ? `, ${branch.city}` : ''}
                </p>
              )}
              {branch.latitude && branch.longitude && (
                <p className="text-xs text-gray-400 mt-2 font-mono">
                  {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}
                </p>
              )}
            </CardContent>
          </Card>
        )) || (
          <p className="text-gray-400 col-span-full text-center py-8">No branches yet</p>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Branch"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={createBranch.isPending}>Create Branch</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Branch Name"
              value={newBranch.name}
              onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              required
            />
            <Input
              label="Branch Code"
              value={newBranch.code}
              onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            value={newBranch.address}
            onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={newBranch.city}
              onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
            />
            <Input
              label="Country"
              value={newBranch.country}
              onChange={(e) => setNewBranch({ ...newBranch, country: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Latitude"
              value={newBranch.latitude}
              onChange={(e) => setNewBranch({ ...newBranch, latitude: e.target.value })}
            />
            <Input
              label="Longitude"
              value={newBranch.longitude}
              onChange={(e) => setNewBranch({ ...newBranch, longitude: e.target.value })}
            />
            <Input
              label="Geofence Radius (m)"
              type="number"
              value={newBranch.geofence_radius_meters}
              onChange={(e) => setNewBranch({ ...newBranch, geofence_radius_meters: Number(e.target.value) })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
