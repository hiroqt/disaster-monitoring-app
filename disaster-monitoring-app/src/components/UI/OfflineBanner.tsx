import { WifiOff } from 'lucide-react';
import { useHazardStore } from '../../store/useHazardStore';
import { formatDistanceToNow } from 'date-fns';
import styles from './OfflineBanner.module.css';

function OfflineBanner() {
  const { isOffline, lastUpdated } = useHazardStore();

  if (!isOffline) return null;

  return (
    <div className={styles.banner}>
      <WifiOff size={16} />
      <span>
        Offline Mode - {lastUpdated ? `Last updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : 'No cached data'}
      </span>
    </div>
  );
}

export default OfflineBanner;
