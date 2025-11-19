import { useState } from 'react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'about'>('home');

  return (
    <Layout onNavigate={setCurrentPage}>
      {currentPage === 'home' ? <HomePage /> : <AboutPage />}
    </Layout>
  );
}

export default App;
