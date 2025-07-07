import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Leads from './components/Leads'

function App() {
  const [currentSection, setCurrentSection] = useState('dashboard')

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard />
      case 'leads':
        return <Leads />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentSection={currentSection} setCurrentSection={setCurrentSection} />
      <main className="flex-1 overflow-auto">
        {renderSection()}
      </main>
    </div>
  )
}

export default App
