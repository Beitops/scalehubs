import { useState } from 'react'
import Sidebar from './Sidebar'
import Dashboard from './Dashboard'
import Leads from './Leads'
import { useAuthStore } from '../store/authStore'

const Platform = () => {
  const [currentSection, setCurrentSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [messageVisible, setMessageVisible] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    company: '',
    role: 'client' as 'admin' | 'client'
  })
  const { user, logout } = useAuthStore()

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

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()

    // Simular creación de usuario
    console.log('Nuevo usuario:', newUser)

    // Cerrar modal y sidebar (en móvil)
    setShowAddUserModal(false)
    setSidebarOpen(false)

    // Mostrar mensaje con animación
    setShowSuccessMessage(true)
    setTimeout(() => setMessageVisible(true), 100)

    // Limpiar formulario
    setNewUser({
      name: '',
      email: '',
      company: '',
      role: 'client'
    })

    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      setMessageVisible(false)
      setTimeout(() => setShowSuccessMessage(false), 300)
    }, 3000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewUser({
      ...newUser,
      [e.target.name]: e.target.value
    })
  }

  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
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

        {/* Add User Modal overlay */}

        {showAddUserModal && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-51"
            onClick={() => setShowAddUserModal(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <Sidebar
            currentSection={currentSection}
            setCurrentSection={setCurrentSection}
            onClose={handleCloseSidebar}
            sidebarOpen={sidebarOpen}
            user={user}
            onLogout={logout}
            onAddUser={() => setShowAddUserModal(true)}
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
            {renderSection()}
          </main>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Añadir Nuevo Usuario</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#373643] mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#373643] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-[#373643] mb-2">
                  Empresa
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={newUser.company}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-[#373643] mb-2">
                  Rol
                </label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                >
                  <option value="client">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className={`fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] transition-all duration-300 ease-in-out transform ${messageVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}>
          <div className="flex items-center">
            <span className="mr-2">✅</span>
            <span>Usuario creado con éxito</span>
          </div>
        </div>
      )}
    </>
  )
}

export default Platform 