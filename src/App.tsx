import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { PartnerPage } from './pages/PartnerPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/location/:id" element={<LocationDetailPage />} />
        <Route path="/partner" element={<PartnerPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
