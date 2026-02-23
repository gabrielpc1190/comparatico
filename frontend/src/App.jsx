import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Search, ScanBarcode, UploadCloud, BarChart3 } from 'lucide-react';
import Home from './components/Home';
import Scanner from './components/Scanner';
import Upload from './components/Upload';
import Stats from './components/Stats';

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
      <header className="glass-panel" style={{
        padding: '0.75rem',
        marginBottom: '1.5rem',
        borderBottom: '4px solid #ce1126' // Red stripe for Costa Rica
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Comparatico Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <h1 style={{ marginBottom: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#002b7f' }}>COMPARA</span>
            <span style={{ color: '#ce1126' }}>TICO</span>
          </h1>
        </Link>
      </header>

      <main className="animate-fade-in" style={{ paddingBottom: '120px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </main>

      <nav className="glass-panel" style={{ position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-around', padding: '0.75rem', zIndex: 50 }}>
        <Link to="/" style={{ color: location.pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} className="flex-center">
          <Search size={24} />
        </Link>
        <Link to="/stats" style={{ color: location.pathname === '/stats' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} className="flex-center">
          <BarChart3 size={24} />
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
