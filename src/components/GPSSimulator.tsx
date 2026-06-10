import React, { useEffect, useState } from 'react';
import { Compass, AlertCircle, Crosshair } from 'lucide-react';
import { getSettings } from '../utils/mockDb';
import { getDistanceInMeters } from '../utils/geo';

interface GPSSimulatorProps {
  currentLat: number;
  currentLng: number;
  locationMode: 'lagos' | 'abuja' | 'remote' | 'real';
  onLocationChange: (lat: number, lng: number, mode: 'lagos' | 'abuja' | 'remote' | 'real') => void;
}

export const GPSSimulator: React.FC<GPSSimulatorProps> = ({
  currentLat,
  currentLng,
  locationMode,
  onLocationChange,
}) => {
  const [officeSettings, setOfficeSettings] = useState(getSettings());
  const [distance, setDistance] = useState<number>(0);
  const [nearestOfficeName, setNearestOfficeName] = useState<string>('');
  const [withinGeofence, setWithinGeofence] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setOfficeSettings(getSettings());
    };
    window.addEventListener('office_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('office_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Compute nearest office distance and within-bounds state
  useEffect(() => {
    const offices = officeSettings.offices || [];
    if (offices.length === 0) return;

    let minDistance = Infinity;
    let closestOffice = offices[0];
    let isInsideAny = false;

    offices.forEach(office => {
      const dist = getDistanceInMeters(
        currentLat,
        currentLng,
        office.latitude,
        office.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestOffice = office;
      }
      if (dist <= office.radiusMeters) {
        isInsideAny = true;
      }
    });

    setDistance(minDistance);
    setNearestOfficeName(closestOffice.name);
    setWithinGeofence(isInsideAny);
  }, [currentLat, currentLng, officeSettings]);

  const selectMode = (mode: 'lagos' | 'abuja' | 'remote' | 'real') => {
    setErrorMessage(null);
    const offices = officeSettings.offices || [];
    if (offices.length === 0) return;

    const lagosOffice = offices.find(o => o.id === 'off-1') || offices[0];
    const abujaOffice = offices.find(o => o.id === 'off-2') || offices[1] || offices[0];

    if (mode === 'lagos') {
      const lat = lagosOffice.latitude + 0.00003;
      const lng = lagosOffice.longitude + 0.00003;
      onLocationChange(lat, lng, 'lagos');
    } else if (mode === 'abuja') {
      const lat = abujaOffice.latitude + 0.00003;
      const lng = abujaOffice.longitude + 0.00003;
      onLocationChange(lat, lng, 'abuja');
    } else if (mode === 'remote') {
      // 5km away from Lagos office
      const lat = lagosOffice.latitude + 0.035;
      const lng = lagosOffice.longitude + 0.035;
      onLocationChange(lat, lng, 'remote');
    } else if (mode === 'real') {
      if (!navigator.geolocation) {
        setErrorMessage('Browser Geolocation is not supported by this device.');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationChange(
            position.coords.latitude,
            position.coords.longitude,
            'real'
          );
        },
        (error) => {
          setErrorMessage(`GPS Permission Denied: ${error.message}`);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  return (
    <div className="gps-sim-widget glass-panel animated-fadeIn">
      <div className="gps-sim-header">
        <h4>
          <Compass className="text-indigo-600" size={18} />
          <span>GPS Simulator</span>
        </h4>
        <span
          className={`gps-sim-status badge ${
            withinGeofence ? 'badge-success' : 'badge-warning'
          }`}
        >
          {withinGeofence ? 'On Premises' : 'Remote Location'}
        </span>
      </div>

      <div className="gps-sim-actions">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <button
            type="button"
            className={`btn ${locationMode === 'lagos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            onClick={() => selectMode('lagos')}
          >
            Lagos Head Office
          </button>
          <button
            type="button"
            className={`btn ${locationMode === 'abuja' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            onClick={() => selectMode('abuja')}
          >
            Abuja Branch
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <button
            type="button"
            className={`btn ${locationMode === 'remote' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            onClick={() => selectMode('remote')}
          >
            Remote (5.4km)
          </button>
          <button
            type="button"
            className={`btn ${locationMode === 'real' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem' }}
            onClick={() => selectMode('real')}
          >
            <Crosshair size={12} /> Real GPS
          </button>
        </div>

        {errorMessage && (
          <div className="badge badge-danger" style={{ display: 'flex', width: '100%', gap: '0.35rem', alignItems: 'center' }}>
            <AlertCircle size={12} />
            <span style={{ fontSize: '0.7rem' }}>{errorMessage}</span>
          </div>
        )}

        <div className="gps-sim-coordinates">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <strong>Latitude:</strong>
            <span>{currentLat.toFixed(6)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <strong>Longitude:</strong>
            <span>{currentLng.toFixed(6)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
              <strong>Closest Office:</strong>
              <span style={{ fontWeight: 600 }}>{nearestOfficeName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Distance:</strong>
              <span style={{ fontWeight: 'bold', color: withinGeofence ? 'var(--success)' : 'var(--warning)' }}>
                {distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance.toFixed(1)} m`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
