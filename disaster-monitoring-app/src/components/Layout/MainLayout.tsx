import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import OfflineBanner from '../UI/OfflineBanner';
import { useHazardStore } from '../../store/useHazardStore';
import { hazardApi } from '../../services/api';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { setHazards, setLoading, setError, setLastUpdated, setOffline } =
    useHazardStore();

  useEffect(() => {
    // Initial data fetch
    fetchHazards();

    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(fetchHazards, 30000);

    // Online/Offline detection
    const handleOnline = () => {
      setOffline(false);
      fetchHazards();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchHazards = async () => {
    try {
      setLoading(true);
      const data = await hazardApi.getHazards();
      setHazards(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Failed to fetch hazards:', error);
      setError('Failed to load hazard data');
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const isMapView = location.pathname === '/';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {!isMapView && <TopBar />}
      <OfflineBanner />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default MainLayout;
