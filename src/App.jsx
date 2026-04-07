import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import MapDashboard from './pages/MapDashboard.jsx'
import Hazards from './pages/Hazards.jsx'
import Reviews from './pages/Reviews.jsx'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-xl font-bold text-emerald-700">
            Safe Cycling
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/hazards">Hazards</Link>
            <Link to="/reviews">Reviews</Link>
            <Link to="/login">Login</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<MapDashboard />} />
          <Route path="/hazards" element={<Hazards />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
