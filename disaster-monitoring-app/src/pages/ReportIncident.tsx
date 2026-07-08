import { useState, useEffect } from 'react';
import { Camera, MapPin, Send, CheckCircle, Activity, Wind, Waves, Flame, Car } from 'lucide-react';
import { HazardType, UserReport } from '../types';
import { hazardApi } from '../services/api';
import styles from './ReportIncident.module.css';

function ReportIncident() {
  const [type, setType] = useState<HazardType>(HazardType.ACCIDENT);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user's current location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      setError('Location is required to submit a report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const report: UserReport = {
        reporterId: localStorage.getItem('device_id') || 'anonymous',
        type,
        location: {
          latitude: location.lat,
          longitude: location.lon,
        },
        description: description.trim() || undefined,
      };

      await hazardApi.submitReport(report);
      setSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setType(HazardType.ACCIDENT);
        setDescription('');
        setSubmitted(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.success}>
        <CheckCircle size={64} color="#22c55e" />
        <h2>Report Submitted!</h2>
        <p>
          Thank you for contributing to community safety. Your report is pending
          verification.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Report Incident</h1>
        <p>Help your community by reporting disasters and accidents</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Incident Type</label>
          <div className={styles.typeGrid}>
            {Object.values(HazardType).map((hazardType) => (
              <button
                key={hazardType}
                type="button"
                className={`${styles.typeButton} ${
                  type === hazardType ? styles.active : ''
                }`}
                onClick={() => setType(hazardType)}
              >
                {getHazardIcon(hazardType)}
                <span>{hazardType}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description (Optional)</label>
          <textarea
            className={styles.textarea}
            placeholder="Provide additional details about the incident..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
          />
          <span className={styles.charCount}>{description.length}/500</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Location</label>
          <div className={styles.locationBox}>
            <MapPin size={20} />
            {location ? (
              <span>
                {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              </span>
            ) : (
              <span className={styles.locationLoading}>Getting location...</span>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Photo (Coming Soon)</label>
          <button type="button" className={styles.photoButton} disabled>
            <Camera size={20} />
            <span>Take Photo</span>
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting || !location}
        >
          {isSubmitting ? (
            <div className={styles.spinner} />
          ) : (
            <>
              <Send size={20} />
              <span>Submit Report</span>
            </>
          )}
        </button>

        <p className={styles.disclaimer}>
          Reports are moderated before being displayed publicly. False reports may
          result in account suspension.
        </p>
      </form>
    </div>
  );
}

function getHazardIcon(type: HazardType) {
  switch (type) {
    case HazardType.EARTHQUAKE:
      return <Activity size={16} />;
    case HazardType.TYPHOON:
      return <Wind size={16} />;
    case HazardType.FLOOD:
      return <Waves size={16} />;
    case HazardType.FIRE:
      return <Flame size={16} />;
    case HazardType.ACCIDENT:
      return <Car size={16} />;
    default:
      return <MapPin size={16} />;
  }
}

export default ReportIncident;
