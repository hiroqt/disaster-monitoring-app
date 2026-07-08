import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import MapView from './pages/MapView';
import HazardList from './pages/HazardList';
import Settings from './pages/Settings';
import ReportIncident from './pages/ReportIncident';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/hazards" element={<HazardList />} />
          <Route path="/report" element={<ReportIncident />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
