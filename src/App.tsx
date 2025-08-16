import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Register from './pages/Register'
import Platform from './pages/Platform'
import ProtectedRoute from './pages/ProtectedRoute'
import { useSupabaseAuthListener } from './hooks/useSupabaseAuthListener'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
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
          <Route path="/leads" element={<Leads />} />
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
