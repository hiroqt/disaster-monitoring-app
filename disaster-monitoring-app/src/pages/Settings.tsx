import { useState, useEffect } from 'react';
import { Bell, MapPin, Shield, Info, Activity, Wind, Waves, Flame, Car, Heart } from 'lucide-react';
import { NotificationPreferences } from '../types';
import styles from './Settings.module.css';

function Settings() {
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    earthquake: true,
    typhoon: true,
    flood: true,
    fire: true,
    accident: false,
  });

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem('notification_preferences', JSON.stringify(updated));
  };

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Bell size={20} />
          Notification Preferences
        </h2>
        <p className={styles.sectionDescription}>
          Choose which disaster alerts you want to receive
        </p>

        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}><Activity size={20} /></span>
              <div>
                <h3 className={styles.settingName}>Earthquakes</h3>
                <p className={styles.settingDescription}>
                  Magnitude 5.0 and above
                </p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${
                notifications.earthquake ? styles.active : ''
              }`}
              onClick={() => handleToggle('earthquake')}
            >
              <div className={styles.toggleSwitch} />
            </button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}><Wind size={20} /></span>
              <div>
                <h3 className={styles.settingName}>Typhoons</h3>
                <p className={styles.settingDescription}>Typhoon category and above</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${
                notifications.typhoon ? styles.active : ''
              }`}
              onClick={() => handleToggle('typhoon')}
            >
              <div className={styles.toggleSwitch} />
            </button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}><Waves size={20} /></span>
              <div>
                <h3 className={styles.settingName}>Floods</h3>
                <p className={styles.settingDescription}>High hazard zones</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${
                notifications.flood ? styles.active : ''
              }`}
              onClick={() => handleToggle('flood')}
            >
              <div className={styles.toggleSwitch} />
            </button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}><Flame size={20} /></span>
              <div>
                <h3 className={styles.settingName}>Fires</h3>
                <p className={styles.settingDescription}>
                  Fire incidents (report-based)
                </p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${
                notifications.fire ? styles.active : ''
              }`}
              onClick={() => handleToggle('fire')}
            >
              <div className={styles.toggleSwitch} />
            </button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}><Car size={20} /></span>
              <div>
                <h3 className={styles.settingName}>Road Accidents</h3>
                <p className={styles.settingDescription}>Traffic incidents</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${
                notifications.accident ? styles.active : ''
              }`}
              onClick={() => handleToggle('accident')}
            >
              <div className={styles.toggleSwitch} />
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <MapPin size={20} />
          Location
        </h2>
        <div className={styles.infoBox}>
          <Info size={16} />
          <span>
            Location is only accessed when you view the map or submit a report
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Shield size={20} />
          Privacy & Data
        </h2>
        <div className={styles.linksList}>
          <button className={styles.link}>Privacy Policy</button>
          <button className={styles.link}>Terms of Service</button>
          <button className={styles.link}>Data Retention Policy</button>
         qwewqwqewqeqweqw  <button className={`${styles.link} ${styles.danger}`}>
            Delete My Data
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>PH Disaster Monitor v1.0.0</p>
        <p>Made with <Heart size={14} className={styles.heartIcon} style={{ display: 'inline', color: '#ef4444', fill: '#ef4444' }} /> for the Philippines</p>
      </footer>
    </div>
  );
}

export default Settings;
