import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, GeoJSON } from 'react-leaflet';
import { useEffect, useState } from 'react';
import treceBoundaryData from '../data/trece-martires-boundary.json';
import { renderToString } from 'react-dom/server';
import { Activity, Wind, Waves, Flame, Car, MapPin } from 'lucide-react';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { useHazardStore } from '../store/useHazardStore';
import { HazardType, HazardRecord, Severity } from '../types';
import HazardDetailSheet from '../components/Map/HazardDetailSheet';
import FilterBar from '../components/Map/FilterBar';
import MapLayerControl, { MAP_LAYERS } from '../components/Map/MapLayerControl';
import MapLegend from '../components/Map/MapLegend';
import styles from './MapView.module.css';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TRECE_MARTIRES_CENTER: LatLngExpression = [14.2831, 120.8653];
const DEFAULT_ZOOM = 13;

function MapController({ selectedHazard }: { selectedHazard: HazardRecord | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedHazard) {
      map.flyTo(
        [selectedHazard.location.latitude, selectedHazard.location.longitude],
        12, // Closer zoom for the disaster
        { duration: 1.5 }
      );
    }
  }, [selectedHazard, map]);
  return null;
}

function MapView() {
  const { hazards, filterType, selectedHazard, setSelectedHazard } = useHazardStore();
  const [currentLayer, setCurrentLayer] = useState('osm');

  const filteredHazards = filterType === 'all' 
    ? hazards 
    : hazards.filter(h => h.type === filterType);

  const activeLayer = MAP_LAYERS.find(layer => layer.id === currentLayer) || MAP_LAYERS[0];

  // Calculate hazard counts for legend
  const hazardCounts = hazards.reduce((acc, hazard) => {
    acc[hazard.type] = (acc[hazard.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getBoundaryStyle = (layerId: string) => {
    const isDark = layerId === 'dark' || layerId === 'satellite';
    return {
      color: isDark ? '#22d3ee' : '#e11d48', // Bright cyan for dark, strong rose-red for light
      weight: 3,
      dashArray: '8, 8',
      opacity: 1,
      fillColor: isDark ? '#22d3ee' : '#e11d48',
      fillOpacity: 0.05,
    };
  };

  const getHazardColor = (type: HazardType): string => {
    switch (type) {
      case HazardType.EARTHQUAKE:
        return '#f59e0b';
      case HazardType.TYPHOON:
        return '#3b82f6';
      case HazardType.FLOOD:
        return '#06b6d4';
      case HazardType.FIRE:
        return '#ef4444';
      case HazardType.ACCIDENT:
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getRadiusByType = (hazard: HazardRecord): number => {
    if (hazard.type === HazardType.EARTHQUAKE) {
      const magnitude = (hazard.metadata as any).magnitude || 0;
      return magnitude * 10000; // Scale by magnitude
    }
    if (hazard.type === HazardType.TYPHOON) {
      return 50000;
    }
    if (hazard.type === HazardType.FIRE) {
      return 3000;
    }
    return 5000;
  };

  const createCustomIcon = (type: HazardType, severity: Severity, isSelected: boolean) => {
    const color = getHazardColor(type);
    const size = severity === Severity.CRITICAL ? 32 : severity === Severity.HIGH ? 28 : 24;
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: ${isSelected ? '3px solid #fff' : '2px solid white'};
          border-radius: 50%;
          box-shadow: ${isSelected ? `0 0 0 8px ${color}66, 0 4px 12px rgba(0,0,0,0.5)` : '0 2px 8px rgba(0,0,0,0.3)'};
          transform: ${isSelected ? 'scale(1.2)' : 'none'};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          ${isSelected ? `animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;` : ''}
        ">
          ${getHazardEmoji(type)}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getHazardEmoji = (type: HazardType): string => {
    switch (type) {
      case HazardType.EARTHQUAKE:
        return renderToString(<Activity size={16} />);
      case HazardType.TYPHOON:
        return renderToString(<Wind size={16} />);
      case HazardType.FLOOD:
        return renderToString(<Waves size={16} />);
      case HazardType.FIRE:
        return renderToString(<Flame size={16} />);
      case HazardType.ACCIDENT:
        return renderToString(<Car size={16} />);
      default:
        return renderToString(<MapPin size={16} />);
    }
  };

  return (
    <div className={styles.container}>
      <FilterBar />
      <MapLayerControl 
        currentLayer={currentLayer}
        onLayerChange={setCurrentLayer}
      />
      <MapLegend hazardCounts={hazardCounts} />
      
      <MapContainer
        center={TRECE_MARTIRES_CENTER}
        zoom={DEFAULT_ZOOM}
        className={styles.map}
        zoomControl={true}
      >
        <TileLayer
          key={activeLayer.id}
          attribution={activeLayer.attribution}
          url={activeLayer.url}
          maxZoom={activeLayer.maxZoom}
        />
        <GeoJSON 
          key={`boundary-${currentLayer}`}
          data={treceBoundaryData as any} 
          style={() => getBoundaryStyle(currentLayer)} 
        />
        <MapController selectedHazard={selectedHazard} />

        {filteredHazards.map((hazard) => (
          <div key={hazard.id}>
            <Marker
              position={[hazard.location.latitude, hazard.location.longitude]}
              icon={createCustomIcon(hazard.type, hazard.severity, selectedHazard?.id === hazard.id)}
              eventHandlers={{
                click: () => setSelectedHazard(hazard),
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                    {hazard.type.toUpperCase()}
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    {hazard.description || 'No description available'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.7 }}>
                    {new Date(hazard.timestamp).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>

            {(hazard.type === HazardType.EARTHQUAKE || 
              hazard.type === HazardType.TYPHOON || 
              hazard.type === HazardType.FIRE) && (
              <Circle
                center={[hazard.location.latitude, hazard.location.longitude]}
                radius={getRadiusByType(hazard)}
                pathOptions={{
                  fillColor: getHazardColor(hazard.type),
                  fillOpacity: 0.1,
                  color: getHazardColor(hazard.type),
                  weight: 2,
                  opacity: 0.4,
                }}
              />
            )}
          </div>
        ))}
      </MapContainer>

      {selectedHazard && (
        <HazardDetailSheet
          hazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
        />
      )}
    </div>
  );
}

export default MapView;
