import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Register from './pages/Register'
import Platform from './pages/Platform'
import ProtectedRoute from './pages/ProtectedRoute'
import { useSupabaseAuthListener } from './hooks/useSupabaseAuthListener'





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
        />

        {/* Redirect to auth if no route matches */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>

  )
}

export default App
