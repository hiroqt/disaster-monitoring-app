import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import styles from './TopBar.module.css';

function TopBar() {
  const navigate = useNavigate();

  return (
    <header className={styles.topBar}>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        <ArrowLeft size={24} />
      </button>
      <h1 className={styles.title}>PH Disaster Monitor</h1>
    </header>
  );
}

export default TopBar;
