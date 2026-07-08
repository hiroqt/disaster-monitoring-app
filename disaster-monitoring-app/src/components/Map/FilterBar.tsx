import { useHazardStore } from '../../store/useHazardStore';
import { HazardType } from '../../types';
import { Activity, Wind, Waves, Flame, Car, Map } from 'lucide-react';
import styles from './FilterBar.module.css';

function FilterBar() {
  const { filterType, setFilterType, hazards } = useHazardStore();

  const filters = [
    { type: 'all' as const, label: 'All', icon: <Map size={16} /> },
    { type: HazardType.EARTHQUAKE, label: 'Earthquake', icon: <Activity size={16} /> },
    { type: HazardType.TYPHOON, label: 'Typhoon', icon: <Wind size={16} /> },
    { type: HazardType.FLOOD, label: 'Flood', icon: <Waves size={16} /> },
    { type: HazardType.FIRE, label: 'Fire', icon: <Flame size={16} /> },
    { type: HazardType.ACCIDENT, label: 'Accident', icon: <Car size={16} /> },
  ];

  const getCount = (type: HazardType | 'all') => {
    if (type === 'all') return hazards.length;
    return hazards.filter(h => h.type === type).length;
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.scrollContainer}>
        {filters.map(({ type, label, icon }) => (
          <button
            key={type}
            className={`${styles.filterButton} ${filterType === type ? styles.active : ''}`}
            onClick={() => setFilterType(type)}
          >
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>{label}</span>
            <span className={styles.count}>{getCount(type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default FilterBar;
