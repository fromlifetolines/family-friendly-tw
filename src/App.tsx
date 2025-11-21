import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { PartnerPage } from './pages/PartnerPage';
import { FeedbackPage } from './pages/FeedbackPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/location/:id" element={<LocationDetailPage />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
