import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Search, ScanBarcode, UploadCloud } from 'lucide-react';
import Home from './components/Home';
import Scanner from './components/Scanner';
import Upload from './components/Upload';

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <div className="container">
      <header className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 0, fontSize: '1.5rem', color: 'var(--accent-primary)' }}>
          Comparatico
        </h1>
      </header>

      <main className="animate-fade-in" style={{ paddingBottom: '80px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </main>

      <nav className="glass-panel" style={{ position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-around', padding: '0.75rem', zIndex: 50 }}>
        <Link to="/" style={{ color: location.pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} className="flex-center">
          <Search size={24} />
        </Link>
        <Link to="/scanner" style={{ color: location.pathname === '/scanner' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} className="flex-center">
          <ScanBarcode size={24} />
        </Link>
        <Link to="/upload" style={{ color: location.pathname === '/upload' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} className="flex-center">
          <UploadCloud size={24} />
        </Link>
      </nav>
    </div>
  );
}

export default App;
