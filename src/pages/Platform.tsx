import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuthStore } from '../store/authStore'
import { userService } from '../services/userService'
import type { NewUserData } from '../services/userService'
import { supabase } from '../lib/supabase'
import { useLeadsStore } from '../store/leadsStore'
import { Outlet } from 'react-router-dom'


const Platform = () => {
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showErrorMessage, setShowErrorMessage] = useState(false)
  const [messageVisible, setMessageVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newUser, setNewUser] = useState({
    nombre: '',
    email: '',
    rol: '',
    cif: '' // Movido después del rol
  })



  const { user, logout, checkAuth } = useAuthStore()
  const { loadInitialLeads, loadDevoluciones, isInitialized } = useLeadsStore()

  // Cargar leads cuando el usuario esté autenticado
  useEffect(() => {

    if (!user) return

    let isReady = true
    const loadInitialLoadsAndDevoluciones = async () => {

      if (isReady) {


        try {

          await loadInitialLeads()
          loadDevoluciones()

        } catch (error) {
          console.error('Error loading data:', error)

        }
      }

      return () => {
        isReady = false
      }

    }

    loadInitialLoadsAndDevoluciones()
  }, [checkAuth, loadInitialLeads, loadDevoluciones, user])




  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setShowSuccessMessage(false)
    setShowErrorMessage(false)

    try {
      let userData: NewUserData

      if (newUser.rol === 'client') {
        // Para clientes, buscar el ID de la empresa por CIF
        if (!newUser.cif.trim()) {
          throw new Error('El CIF de la empresa es obligatorio para usuarios cliente.')
        }

        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('id, nombre')
          .eq('cif', newUser.cif)
          .single()

        if (empresaError || !empresa) {
          throw new Error('Empresa no encontrada con el CIF proporcionado. Verifica que el CIF sea correcto.')
        }

        userData = {
          nombre: newUser.nombre,
          email: newUser.email,
          empresa: empresa.id.toString(),
          rol: newUser.rol
        }
      } else {
        // Para administradores, no se requiere empresa
        userData = {
          nombre: newUser.nombre,
          email: newUser.email,
          empresa: '', // Los admins no tienen empresa
          rol: newUser.rol
        }
      }

      // Enviar solicitud al backend
      await userService.registerUser(userData)

      // Mostrar mensaje de éxito
      const successMessage = newUser.rol === 'client'
        ? `Usuario cliente invitado con éxito. Se ha enviado un email de registro.`
        : `Usuario administrador invitado con éxito. Se ha enviado un email de registro.`

      setMessage(successMessage)
      setShowSuccessMessage(true)
      setTimeout(() => setMessageVisible(true), 100)

      // Cerrar modal y sidebar (en móvil)
      setShowAddUserModal(false)
      setSidebarOpen(false)

      // Limpiar formulario
      setNewUser({
        nombre: '',
        email: '',
        rol: 'client',
        cif: ''
      })

    } catch (error) {
      // Mostrar mensaje de error
      setMessage(error instanceof Error ? error.message : 'Error al invitar usuario')
      setShowErrorMessage(true)
      setTimeout(() => setMessageVisible(true), 100)
    } finally {
      setIsLoading(false)

      // Ocultar mensaje después de 4 segundos
      setTimeout(() => {
        setMessageVisible(false)
        setTimeout(() => {
          setShowSuccessMessage(false)
          setShowErrorMessage(false)
        }, 300)
      }, 4000)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // Si se cambia el rol a admin, limpiar el CIF
            if (name === 'rol' && value === 'administrador') {
      setNewUser({
        ...newUser,
        [name]: value,
        cif: ''
      })
    } else {
      setNewUser({
        ...newUser,
        [name]: value
      })
    }
  }

  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  if (!isInitialized) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando datos...</span>
      </div>
    )
  }

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
            onClose={handleCloseSidebar}
            sidebarOpen={sidebarOpen}
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
            <Outlet />
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
                  value={newUser.nombre}
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
                <label htmlFor="role" className="block text-sm font-medium text-[#373643] mb-2">
                  Rol
                </label>
                <select
                  id="role"
                  name="role"
                  value={newUser.rol}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                >
                  <option value="client">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {newUser.rol === 'client' && (
                <div>
                  <label htmlFor="cif" className="block text-sm font-medium text-[#373643] mb-2">
                    CIF de la empresa
                  </label>
                  <input
                    type="text"
                    id="cif"
                    name="cif"
                    value={newUser.cif}
                    onChange={handleInputChange}
                    required={newUser.rol === 'client'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    placeholder="Ej: B12345678"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El sistema verificará que la empresa exista con este CIF
                  </p>
                </div>
              )}

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
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    'Crear Usuario'
                  )}
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
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {showErrorMessage && (
        <div className={`fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] transition-all duration-300 ease-in-out transform ${messageVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}>
          <div className="flex items-center">
            <span className="mr-2">❌</span>
            <span>{message}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default Platform 