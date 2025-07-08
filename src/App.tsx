import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './components/Auth'
import Platform from './components/Platform'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth route */}
        <Route path="/auth" element={<Auth />} />
        
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
    </Router>
  )
}

export default App
