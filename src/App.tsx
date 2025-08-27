import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Register from './pages/Register'
import Platform from './pages/Platform'
import ProtectedRoute from './pages/ProtectedRoute'
import { useSupabaseAuthListener } from './hooks/useSupabaseAuthListener'
import Dashboard from './pages/Dashboard'
import MenuLeads from './pages/MenuLeads'
import Leads from './pages/Leads'
import HistorialLeads from './pages/HistorialLeads'
import Devoluciones from './pages/Devoluciones'
import Empresas from './pages/Empresas'
import Usuarios from './pages/Usuarios'
import Home from './pages/Home'

function App() {

  useSupabaseAuthListener()

  return (

      <Routes>
        {/* Auth route */}
        <Route path="/auth" element={<Auth />} />

        {/* Set password route (for invited users) */}
        <Route path="/set-password" element={<Register />} />

        <Route path="/prueba" element={<h1>Prueba</h1>} />

        {/* Protected platform routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Platform />
            </ProtectedRoute>
          }
        >
          <Route index path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<MenuLeads />} />
          <Route path="/leads/activos" element={<Leads />} />
          <Route path="/leads/historial" element={<HistorialLeads />} />
          <Route path="/devoluciones" element={<Devoluciones />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>

        {/* Redirect to auth if no route matches */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>

  )
}

export default App
