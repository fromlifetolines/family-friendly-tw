import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContributePage from './pages/ContributePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/contribute" element={<ContributePage />} />
    </Routes>
  );
}

export default App;
