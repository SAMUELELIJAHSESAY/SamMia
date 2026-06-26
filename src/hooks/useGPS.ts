import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  address?: string;
}

interface GPSState {
  location: GPSLocation | null;
  error: string | null;
  loading: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export function useGPS(options?: PositionOptions) {
  const [state, setState] = useState<GPSState>({
    location: null,
    error: null,
    loading: false,
    permission: 'unknown',
  });

  const showToast = useUIStore((s) => s.showToast);

  const getCurrentPosition = useCallback(async (): Promise<GPSLocation | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          ...options,
        });
      });

      const location: GPSLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      };

      // Try to get address via reverse geocoding
      try {
        const address = await reverseGeocode(location.latitude, location.longitude);
        location.address = address;
      } catch {
        // Address is optional
      }

      setState({
        location,
        error: null,
        loading: false,
        permission: 'granted',
      });

      return location;
    } catch (error: any) {
      const errorMessage = error.code === 1
        ? 'Location permission denied. Please enable location access in your browser settings.'
        : error.code === 2
        ? 'Unable to determine location. Please try again.'
        : error.code === 3
        ? 'Location request timed out. Please try again.'
        : error.message;

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
        permission: error.code === 1 ? 'denied' : 'unknown',
      }));

      showToast(errorMessage, 'error');
      return null;
    }
  }, [options, showToast]);

  const watchPosition = useCallback((callback: (location: GPSLocation) => void) => {
    if (!navigator.geolocation) return null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };
        setState((prev) => ({ ...prev, location, permission: 'granted' }));
        callback(location);
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: error.message,
          permission: error.code === 1 ? 'denied' : 'unknown',
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [options]);

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) return;

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setState((prev) => ({ ...prev, permission: result.state as GPSState['permission'] }));

      result.addEventListener('change', () => {
        setState((prev) => ({ ...prev, permission: result.state as GPSState['permission'] }));
      });
    } catch {
      // Some browsers don't support permissions API for geolocation
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    getCurrentPosition,
    watchPosition,
    checkPermission,
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

export function useGeofence(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
) {
  const { location, getCurrentPosition } = useGPS();
  const [isInside, setIsInside] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const checkGeofence = useCallback(async () => {
    const loc = location || await getCurrentPosition();
    if (!loc) return null;

    const dist = calculateDistance(
      loc.latitude,
      loc.longitude,
      centerLat,
      centerLng
    );

    setDistance(dist);
    setIsInside(dist <= radiusMeters);
    return { isInside: dist <= radiusMeters, distance: dist };
  }, [location, centerLat, centerLng, radiusMeters, getCurrentPosition]);

  useEffect(() => {
    if (location) {
      checkGeofence();
    }
  }, [location, checkGeofence]);

  return {
    isInside,
    distance,
    checkGeofence,
    location,
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
