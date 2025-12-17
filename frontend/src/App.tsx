import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout/Layout';
import MapPage from './pages/MapPage';
import CompareVolcanoesPage from './pages/CompareVolcanoesPage';
import CompareVEIPage from './pages/CompareVEIPage';
import AnalyzeVolcanoPage from './pages/AnalyzeVolcanoPage';
import TimelinePage from './pages/TimelinePage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              maxWidth: '500px',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/map" replace />} />
            <Route path="map" element={<MapPage />} />
            <Route path="compare-volcanoes" element={<CompareVolcanoesPage />} />
            <Route path="compare-vei" element={<CompareVEIPage />} />
            <Route path="analyze" element={<AnalyzeVolcanoPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
