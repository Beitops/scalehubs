import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import SettingsModal from '../components/SettingsModal'
import { useAuthStore } from '../store/authStore'
import { Outlet } from 'react-router-dom'

const Platform = () => {
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const { logout } = useAuthStore()

  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile menu overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <Sidebar
            onClose={handleCloseSidebar}
            sidebarOpen={sidebarOpen}
            onLogout={logout}
            onOpenSettings={handleOpenSettings}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Mobile header */}
          <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={handleOpenSidebar}
                className="text-[#373643] hover:text-[#18cb96] focus:outline-none focus:text-[#18cb96]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-[#373643]">
                <span className="text-[#18cb96]">Scale</span>Hubs
              </h1>
              <div className="w-6"></div> {/* Spacer for centering */}
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </>
  )
}

export default Platform 