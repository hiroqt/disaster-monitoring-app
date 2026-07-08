import { NavLink } from 'react-router-dom';
import { Map, List, FileText, Settings } from 'lucide-react';
import styles from './BottomNav.module.css';

function BottomNav() {
  return (
    <nav className={styles.bottomNav}>
      <NavLink
        to="/"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }
      >
        <Map size={24} />
        <span>Map</span>
      </NavLink>

      <NavLink
        to="/hazards"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }
      >
        <List size={24} />
        <span>Hazards</span>
      </NavLink>

      <NavLink
        to="/report"
        className={({ isActive }) =>
          `${styles.navItem} ${styles.reportButton} ${isActive ? styles.active : ''}`
        }
      >
        <FileText size={24} />
        <span>Report</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ''}`
        }
      >
        <Settings size={24} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}

export default BottomNav;
