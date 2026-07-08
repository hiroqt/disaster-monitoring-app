import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHazardStore } from '../store/useHazardStore';
import { HazardType, Severity } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Flame, MapPin, Clock, Activity, Wind, Waves, Car, Map } from 'lucide-react';
import styles from './HazardList.module.css';

function HazardList() {
  const { hazards, isLoading, setSelectedHazard } = useHazardStore();
  const [selectedType, setSelectedType] = useState<HazardType | 'all'>('all');
  const navigate = useNavigate();

  const filteredHazards =
    selectedType === 'all'
      ? hazards
      : hazards.filter((h) => h.type === selectedType);

  const sortedHazards = [...filteredHazards].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getHazardIcon = (type: HazardType) => {
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
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return '#ef4444';
      case Severity.HIGH:
        return '#f59e0b';
      case Severity.MEDIUM:
        return '#eab308';
      case Severity.LOW:
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  if (isLoading && hazards.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading hazards...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        {(['all', ...Object.values(HazardType)] as const).map((type) => (
          <button
            key={type}
            className={`${styles.filterButton} ${
              selectedType === type ? styles.active : ''
            }`}
            onClick={() => setSelectedType(type)}
          >
            {type === 'all' ? <><Map size={16} /> All</> : <>{getHazardIcon(type as HazardType)} {type}</>}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {sortedHazards.length === 0 ? (
          <div className={styles.empty}>
            <Flame size={48} />
            <h3>No {selectedType === 'all' ? '' : selectedType} hazards</h3>
            <p>Great news! There are no active hazards to display.</p>
          </div>
        ) : (
          sortedHazards.map((hazard) => (
            <div 
              key={hazard.id} 
              className={styles.card}
              onClick={() => {
                setSelectedHazard(hazard);
                navigate('/');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.typeIcon}>{getHazardIcon(hazard.type)}</div>
                <div className={styles.headerInfo}>
                  <h3 className={styles.hazardType}>
                    {hazard.type.charAt(0).toUpperCase() + hazard.type.slice(1)}
                  </h3>
                  <div
                    className={styles.severityBadge}
                    style={{ background: getSeverityColor(hazard.severity) }}
                  >
                    {hazard.severity}
                  </div>
                </div>
              </div>

              {hazard.description && (
                <p className={styles.description}>{hazard.description}</p>
              )}

              <div className={styles.details}>
                <div className={styles.detail}>
                  <Clock size={14} />
                  <span>
                    {formatDistanceToNow(new Date(hazard.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className={styles.detail}>
                  <MapPin size={14} />
                  <span>
                    {hazard.location.latitude.toFixed(2)},{' '}
                    {hazard.location.longitude.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={styles.sources}>
                {hazard.sources.map((source) => (
                  <span key={source} className={styles.source}>
                    {source}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HazardList;
