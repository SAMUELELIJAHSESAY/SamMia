import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { QRCode } from '../types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useQRCodes() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['qrCodes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*, branch:branch_id(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QRCode[];
    },
    enabled: !!companyId,
  });
}

export function useQRCodeValidation() {
  return useMutation({
    mutationFn: async (payload: {
      code: string;
      token: string;
      latitude?: number;
      longitude?: number;
      deviceId?: string;
    }) => {
      const response = await fetch(`${EDGE_FUNCTION_URL}/qr-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ...payload,
          employeeId: useAuthStore.getState().user?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'QR validation failed');
      }
      return data;
    },
  });
}

export function useCreateQRCode() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      branchId?: string;
      type?: string;
      expiresAt?: string;
      maxUses?: number;
      gpsRequired?: boolean;
      geofenceRequired?: boolean;
      allowedLatitude?: number;
      allowedLongitude?: number;
      allowedRadiusMeters?: number;
    }) => {
      const code = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const insertData: Record<string, unknown> = {
        company_id: companyId,
        name: payload.name,
        code,
        secret,
        branch_id: payload.branchId || null,
        type: payload.type || 'permanent',
        expires_at: payload.expiresAt || null,
        max_uses: payload.maxUses || null,
        gps_required: payload.gpsRequired ?? true,
        geofence_required: payload.geofenceRequired ?? false,
        allowed_latitude: payload.allowedLatitude || null,
        allowed_longitude: payload.allowedLongitude || null,
        allowed_radius_meters: payload.allowedRadiusMeters || 100,
        current_token: secret,
        created_by: useAuthStore.getState().user?.id,
      };

      const { data, error } = await supabase
        .from('qr_codes')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCodes'] });
    },
  });
}

export function useUpdateQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('qr_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCodes'] });
    },
  });
}

export function useDeleteQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qr_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCodes'] });
    },
  });
}
