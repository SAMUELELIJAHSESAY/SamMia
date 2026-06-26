import { useState } from 'react';
import { useBranches } from '../../hooks/useCompany';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MapPin, Navigation, Radius, Plus } from 'lucide-react';

export function LocationsPage() {
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const companyId = useAuthStore((s) => s.companyId);
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radiusMeters: '100',
  });

  // Fetch geofence zones
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['geofenceZones', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const createZone = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('geofence_zones')
        .insert({
          company_id: companyId,
          branch_id: selectedBranch || null,
          name: payload.name,
          latitude: parseFloat(payload.latitude),
          longitude: parseFloat(payload.longitude),
          radius_meters: parseInt(payload.radiusMeters),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofenceZones'] });
      showToast('Geofence zone added', 'success');
      setShowAddModal(false);
      setNewZone({ name: '', latitude: '', longitude: '', radiusMeters: '100' });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to add zone', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations & Geofencing</h1>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Add Zone
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Branches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {branchesLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {branches && branches.length > 0 ? branches.map((branch: any) => (
                  <div
                    key={branch.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedBranch === branch.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedBranch(branch.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{branch.name}</p>
                        {branch.address && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {branch.address}
                          </p>
                        )}
                      </div>
                      {branch.latitude && branch.longitude && (
                        <Badge variant="success" size="sm">
                          <Navigation className="w-3 h-3 mr-1" />
                          GPS Set
                        </Badge>
                      )}
                    </div>
                    {branch.latitude && branch.longitude && (
                      <p className="text-xs text-gray-400 mt-2 font-mono">
                        {parseFloat(branch.latitude).toFixed(6)}, {parseFloat(branch.longitude).toFixed(6)}
                      </p>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-400 text-center py-4">No branches configured</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geofence Zones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radius className="w-5 h-5" />
              Geofence Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zonesLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {zones.length > 0 ? zones.map((zone: any) => (
                  <div key={zone.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{zone.name}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {parseFloat(zone.latitude).toFixed(6)}, {parseFloat(zone.longitude).toFixed(6)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={zone.is_active ? 'success' : 'neutral'} size="sm">
                          {zone.radius_meters}m
                        </Badge>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-400 text-center py-4">No geofence zones added yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Geofence Zone"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={() => createZone.mutate(newZone)}>Add Zone</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Zone Name"
            value={newZone.name}
            onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
            placeholder="e.g., Main Office"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="0.000001"
              value={newZone.latitude}
              onChange={(e) => setNewZone({ ...newZone, latitude: e.target.value })}
              placeholder="40.7128"
            />
            <Input
              label="Longitude"
              type="number"
              step="0.000001"
              value={newZone.longitude}
              onChange={(e) => setNewZone({ ...newZone, longitude: e.target.value })}
              placeholder="-74.0060"
            />
          </div>
          <Input
            label="Radius (meters)"
            type="number"
            value={newZone.radiusMeters}
            onChange={(e) => setNewZone({ ...newZone, radiusMeters: e.target.value })}
            placeholder="100"
          />
        </div>
      </Modal>
    </div>
  );
}
