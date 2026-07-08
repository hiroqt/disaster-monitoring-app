import { useState, useEffect } from 'react';
import { Activity, Wind, Waves, Flame, Car, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { HazardType } from '../../types';
import styles from './MapLegend.module.css';

interface LegendItem {
  type: HazardType;
  label: string;
  color: string;
  icon: JSX.Element;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    type: HazardType.EARTHQUAKE,
    label: 'Earthquake',
    color: '#f59e0b',
    icon: <Activity size={16} />,
  },
  {
    type: HazardType.TYPHOON,
    label: 'Typhoon',
    color: '#3b82f6',
    icon: <Wind size={16} />,
  },
  {
    type: HazardType.FLOOD,
    label: 'Flood',
    color: '#06b6d4',
    icon: <Waves size={16} />,
  },
  {
    type: HazardType.FIRE,
    label: 'Fire',
    color: '#ef4444',
    icon: <Flame size={16} />,
  },
  {
    type: HazardType.ACCIDENT,
    label: 'Incident',
    color: '#6b7280',
    icon: <Car size={16} />,
  },
];

interface MapLegendProps {
  hazardCounts: Record<string, number>;
}

export default function MapLegend({ hazardCounts }: MapLegendProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-close on mobile initially
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  }, []);

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : styles.closed}`}>
      <button className={styles.toggleButton} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.headerLeft}>
          <MapPin size={16} className={styles.headerIcon} />
          <span className={styles.title}>Map Legend</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {isOpen && (
        <div className={styles.content}>
          <div className={styles.items}>
            {LEGEND_ITEMS.map((item) => {
              const count = hazardCounts[item.type] || 0;
              return (
                <div key={item.type} className={styles.item}>
                  <div
                    className={styles.marker}
                    style={{ backgroundColor: item.color }}
                  >
                    {item.icon}
                  </div>
                  <span className={styles.label}>{item.label}</span>
                  <span className={styles.count}>({count})</span>
                </div>
              );
            })}
          </div>
          <div className={styles.footer}>
            <div className={styles.severityInfo}>
              <span className={styles.infoTitle}>Severity Levels</span>
              <div className={styles.severityLevels}>
                <div className={styles.severityItem}>
                  <div className={styles.severityDot} style={{ width: '12px', height: '12px' }} />
                  <span>Low</span>
                </div>
                <div className={styles.severityItem}>
                  <div className={styles.severityDot} style={{ width: '16px', height: '16px' }} />
                  <span>Med</span>
                </div>
                <div className={styles.severityItem}>
                  <div className={styles.severityDot} style={{ width: '20px', height: '20px' }} />
                  <span>High</span>
                </div>
                <div className={styles.severityItem}>
                  <div className={styles.severityDot} style={{ width: '24px', height: '24px' }} />
                  <span>Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
