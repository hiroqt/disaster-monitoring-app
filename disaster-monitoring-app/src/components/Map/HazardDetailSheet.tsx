import { X, AlertTriangle, MapPin, Clock, CheckCircle } from 'lucide-react';
import { HazardRecord, HazardType } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import styles from './HazardDetailSheet.module.css';

interface Props {
  hazard: HazardRecord;
  onClose: () => void;
}

function HazardDetailSheet({ hazard, onClose }: Props) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const renderMetadata = () => {
    switch (hazard.type) {
      case HazardType.EARTHQUAKE:
        const eqData = hazard.metadata as any;
        return (
          <>
            <div className={styles.metadataItem}>
              <span>Magnitude:</span>
              <strong>{eqData.magnitude}</strong>
            </div>
            <div className={styles.metadataItem}>
              <span>Depth:</span>
              <strong>{eqData.depth_km} km</strong>
            </div>
            <div className={styles.metadataItem}>
              <span>Epicenter:</span>
              <strong>{eqData.epicenter_name}</strong>
            </div>
            {eqData.tsunami_risk && (
              <div className={styles.warning}>
                <AlertTriangle size={16} />
                Tsunami risk detected
              </div>
            )}
          </>
        );
      
      case HazardType.TYPHOON:
        const typhData = hazard.metadata as any;
        return (
          <>
            <div className={styles.metadataItem}>
              <span>Wind Speed:</span>
              <strong>{typhData.wind_speed_kph} km/h</strong>
            </div>
            {typhData.central_pressure_hpa && (
              <div className={styles.metadataItem}>
                <span>Pressure:</span>
                <strong>{typhData.central_pressure_hpa} hPa</strong>
              </div>
            )}
            <div className={styles.metadataItem}>
              <span>Affected Regions:</span>
              <strong>{typhData.affected_regions?.join(', ')}</strong>
            </div>
          </>
        );
      
      case HazardType.FLOOD:
        const floodData = hazard.metadata as any;
        return (
          <>
            <div className={styles.metadataItem}>
              <span>Hazard Level:</span>
              <strong style={{ color: getSeverityColor(floodData.hazard_level) }}>
                {floodData.hazard_level?.toUpperCase()}
              </strong>
            </div>
            <div className={styles.metadataItem}>
              <span>Rainfall:</span>
              <strong>{floodData.rainfall_intensity_mm} mm/hour</strong>
            </div>
            <div className={styles.metadataItem}>
              <span>Municipalities:</span>
              <strong>{floodData.affected_municipalities?.join(', ')}</strong>
            </div>
          </>
        );
      
      case HazardType.FIRE:
        const fireData = hazard.metadata as any;
        return (
          <>
            <div className={styles.metadataItem}>
              <span>Fire Type:</span>
              <strong>{fireData.fire_type?.replace('_', ' ')}</strong>
            </div>
            <div className={styles.metadataItem}>
              <span>Intensity:</span>
              <strong style={{ color: getSeverityColor(fireData.fire_intensity) }}>
                {fireData.fire_intensity?.toUpperCase()}
              </strong>
            </div>
            {fireData.affected_structures && (
              <div className={styles.metadataItem}>
                <span>Structures Affected:</span>
                <strong>{fireData.affected_structures}</strong>
              </div>
            )}
            {fireData.casualties > 0 && (
              <div className={styles.warning}>
                <AlertTriangle size={16} />
                {fireData.casualties} casualty/casualties reported
              </div>
            )}
            {fireData.injuries > 0 && (
              <div className={styles.metadataItem}>
                <span>Injuries:</span>
                <strong>{fireData.injuries}</strong>
              </div>
            )}
            {fireData.estimated_damage && (
              <div className={styles.metadataItem}>
                <span>Est. Damage:</span>
                <strong>{fireData.estimated_damage}</strong>
              </div>
            )}
            <div className={styles.metadataItem}>
              <span>Status:</span>
              <strong>{fireData.verified ? '✓ Verified' : '⚠ Unverified'}</strong>
            </div>
          </>
        );
      
      case HazardType.ACCIDENT:
        const accData = hazard.metadata as any;
        return (
          <>
            <div className={styles.metadataItem}>
              <span>Type:</span>
              <strong>{accData.incident_type?.replace('_', ' ')}</strong>
            </div>
            <div className={styles.metadataItem}>
              <span>Status:</span>
              <strong>{accData.verified ? '✓ Verified' : '⚠ Unverified'}</strong>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              {hazard.type.charAt(0).toUpperCase() + hazard.type.slice(1)} Alert
            </h2>
            <button onClick={onClose} className={styles.closeButton}>
              <X size={24} />
            </button>
          </div>
          <div
            className={styles.severityBadge}
            style={{ background: getSeverityColor(hazard.severity) }}
          >
            {hazard.severity.toUpperCase()}
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.infoRow}>
            <Clock size={16} />
            <span>{formatDistanceToNow(new Date(hazard.timestamp), { addSuffix: true })}</span>
          </div>

          <div className={styles.infoRow}>
            <MapPin size={16} />
            <span>
              {hazard.location.latitude.toFixed(4)}, {hazard.location.longitude.toFixed(4)}
            </span>
          </div>

          {hazard.status === 'multi_source_confirmed' && (
            <div className={styles.infoRow} style={{ color: '#22c55e' }}>
              <CheckCircle size={16} />
              <span>Confirmed by multiple sources</span>
            </div>
          )}

          {hazard.description && (
            <p className={styles.description}>{hazard.description}</p>
          )}

          <div className={styles.metadata}>
            {renderMetadata()}
          </div>

          <div className={styles.sources}>
            <span className={styles.sourcesLabel}>Sources:</span>
            <div className={styles.sourceTags}>
              {hazard.sources.map((source) => (
                <span key={source} className={styles.sourceTag}>
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HazardDetailSheet;
