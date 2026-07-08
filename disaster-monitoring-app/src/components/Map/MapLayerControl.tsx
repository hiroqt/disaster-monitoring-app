import { useState } from 'react';
import { Map, Layers, Satellite, Mountain, Navigation } from 'lucide-react';
import styles from './MapLayerControl.module.css';

export interface MapLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  icon: JSX.Element;
  maxZoom?: number;
}

export const MAP_LAYERS: MapLayer[] = [
  {
    id: 'osm',
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    icon: <Map size={20} />,
    maxZoom: 19,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    icon: <Satellite size={20} />,
    maxZoom: 18,
  },
  {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    icon: <Mountain size={20} />,
    maxZoom: 17,
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    icon: <Layers size={20} />,
    maxZoom: 19,
  },
  {
    id: 'humanitarian',
    name: 'Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://www.hotosm.org/">HOT</a>',
    icon: <Navigation size={20} />,
    maxZoom: 19,
  },
];

interface MapLayerControlProps {
  currentLayer: string;
  onLayerChange: (layerId: string) => void;
}

export default function MapLayerControl({ currentLayer, onLayerChange }: MapLayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Change map layer"
      >
        <Layers size={20} />
      </button>

      {isOpen && (
        <div className={styles.layerMenu}>
          <div className={styles.menuHeader}>
            <span>Map Layers</span>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          <div className={styles.layerList}>
            {MAP_LAYERS.map((layer) => (
              <button
                key={layer.id}
                className={`${styles.layerButton} ${currentLayer === layer.id ? styles.active : ''}`}
                onClick={() => {
                  onLayerChange(layer.id);
                  setIsOpen(false);
                }}
              >
                <span className={styles.layerIcon}>{layer.icon}</span>
                <span className={styles.layerName}>{layer.name}</span>
                {currentLayer === layer.id && (
                  <span className={styles.activeIndicator}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
