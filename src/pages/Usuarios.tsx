import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'
import { userService } from '../services/userService'
import type { DatabaseProfile } from '../types/database'
import type { NewUserData } from '../services/userService'
import { supabase } from '../lib/supabase'

interface UsuariosProps {}

const Usuarios = ({}: UsuariosProps) => {
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<DatabaseProfile | null>(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<DatabaseProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })
  const [newUser, setNewUser] = useState({
    nombre: '',
    email: '',
    rol: '',
    cif: ''
  })
  
  // Estados locales para filtros y UI
  const [filteredUsers, setFilteredUsers] = useState<DatabaseProfile[]>([])
  const [showAdmins, setShowAdmins] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  const { user, userEmpresaId } = useAuthStore()
  
  // Usar el store de usuarios solo para lo esencial
  const {
    users,
    loading,
    error,
    loadUsers,
    deleteUser,
    canAddAgente
  } = useUserStore()

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ show: true, message, type })
  }

  // Auto-ocultar notificación después de 4 segundos
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notification.show])

  useEffect(() => {
    if (user?.rol && (user.rol === 'administrador' || user.rol === 'coordinador' || userEmpresaId)) {
      loadUsers(user.rol, userEmpresaId || undefined)
    }
  }, [user?.rol, userEmpresaId, loadUsers])

  // Aplicar filtros cuando cambien los usuarios o filtros
  useEffect(() => {
    applyFilters()
  }, [users, nameFilter, companyFilter, dateFilter, showAdmins])

  const applyFilters = () => {
    let filtered = [...users]

    // Filtro por nombre
    if (nameFilter) {
      filtered = filtered.filter(user => 
        user.nombre?.toLowerCase().includes(nameFilter.toLowerCase())
      )
    }

    // Filtro por tipo de usuario (admins o clientes)
    if (showAdmins) {
      filtered = filtered.filter(user => user.rol === 'administrador')
    } else {
      filtered = filtered.filter(user => user.rol !== 'administrador')
    }

    // Filtro por empresa (solo para admins)
    if (companyFilter && user?.rol === 'administrador') {
      filtered = filtered.filter(user => 
        user.empresa_id?.toString().includes(companyFilter) ||
        (user as any)?.empresas?.nombre?.toLowerCase().includes(companyFilter.toLowerCase())
      )
    }

    // Filtro por fecha
    if (dateFilter) {
      filtered = filtered.filter(user => 
        user.fecha_creacion.startsWith(dateFilter)
      )
    }

    setFilteredUsers(filtered)
  }



  const clearFilters = () => {
    setNameFilter('')
    setCompanyFilter('')
    setDateFilter('')
    setShowAdmins(false)
  }

  const handleUserClick = (user: DatabaseProfile) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)

    try {
      let userData: NewUserData

      if (user?.rol === 'coordinador') {
        // Para coordinadores, solo pueden añadir agentes
        if (!userEmpresaId) {
          throw new Error('No se pudo identificar la empresa del coordinador.')
        }

        // Validar límite de agentes para coordinadores
        const agentesInfo = await canAddAgente(userEmpresaId)
        if (!agentesInfo.canAdd) {
          throw new Error(`No se pueden añadir más agentes. La empresa ya tiene ${agentesInfo.currentCount} de ${agentesInfo.maxAgentes} agentes permitidos. Contacta al administrador para aumentar el límite.`)
        }

        userData = {
          nombre: newUser.nombre,
          email: newUser.email,
          empresa: userEmpresaId.toString(),
          rol: 'agente'
        }
      } else {
        // Para administradores, validar que se haya seleccionado un rol
        if (!newUser.rol.trim()) {
          throw new Error('Debes seleccionar un rol para el usuario.')
        }

        if (newUser.rol !== 'administrador') {
          // Para coordinadores y agentes, buscar el ID de la empresa por CIF
          if (!newUser.cif.trim()) {
            throw new Error('El CIF de la empresa es obligatorio para usuarios coordinadores y agentes.')
          }

          const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .select('id, nombre')
            .eq('cif', newUser.cif)
            .single()

          if (empresaError || !empresa) {
            throw new Error('Empresa no encontrada con el CIF proporcionado. Verifica que el CIF sea correcto.')
          }

          // Validar límite de agentes si se está creando un agente
          if (newUser.rol === 'agente') {
            const agentesInfo = await canAddAgente(empresa.id)
            if (!agentesInfo.canAdd) {
              throw new Error(`No se pueden añadir más agentes a la empresa ${empresa.nombre}. Ya tiene ${agentesInfo.currentCount} de ${agentesInfo.maxAgentes} agentes permitidos.`)
            }
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
      }

      // Enviar solicitud al backend
      await userService.registerUser(userData)

      // Mostrar mensaje de éxito
      let successMessage = ''
      if (user?.rol === 'coordinador') {
        successMessage = 'Agente invitado con éxito. Se ha enviado un email de registro.'
      } else {
        successMessage = newUser.rol === 'administrador'
          ? `Usuario administrador invitado con éxito. Se ha enviado un email de registro.`
          : `Usuario ${newUser.rol} invitado con éxito. Se ha enviado un email de registro.`
      }

      showNotification(successMessage, 'success')

      // Cerrar modal
      setShowAddUserModal(false)

      // Limpiar formulario
      setNewUser({
        nombre: '',
        email: '',
        rol: '',
        cif: ''
      })

      // Recargar usuarios
      if (user?.rol && (user.rol === 'administrador' || user.rol === 'coordinador' || userEmpresaId)) {
        loadUsers(user.rol, userEmpresaId || undefined)
      }

    } catch (error) {
      // Mostrar mensaje de error
      showNotification(error instanceof Error ? error.message : 'Error al invitar usuario', 'error')
    } finally {
      setIsLoading(false)
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

  const handleDeleteUser = (user: DatabaseProfile) => {
    setUserToDelete(user)
    setShowDeleteConfirmModal(true)
    setShowUserModal(false) // Cerrar modal de detalles
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setIsLoading(true)

      // Eliminar usuario usando el store
      await deleteUser(userToDelete.user_id)

      // Mostrar mensaje de éxito
      showNotification(`Usuario ${userToDelete.nombre || userToDelete.email} eliminado con éxito`, 'success')

      // Cerrar modal de confirmación
      setShowDeleteConfirmModal(false)
      setUserToDelete(null)

      // Recargar usuarios
      if (user?.rol && (user.rol === 'administrador' || user.rol === 'coordinador' || userEmpresaId)) {
        loadUsers(user.rol, userEmpresaId || undefined)
      }

    } catch (error) {
      // Mostrar mensaje de error
      showNotification(error instanceof Error ? error.message : 'Error al eliminar usuario', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleLabel = (user: DatabaseProfile) => {
    let rol = user.rol ?? 'usuario'
    rol = rol.charAt(0).toUpperCase() + rol.slice(1)
    return rol
  }

  const getRoleColor = (rol: string | null | undefined) => {
    if (rol === 'administrador') {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    } else if (rol === 'coordinador') {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando usuarios...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => loadUsers(user?.rol || '', userEmpresaId || undefined)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }



  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8 mx-2 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#373643]">Usuarios</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              {user?.rol === 'administrador'
                ? 'Gestión de usuarios del sistema' 
                : user?.rol === 'coordinador'
                ? 'Gestión de agentes de tu empresa'
                : 'Usuarios de tu empresa'
              }
            </p>
          </div>
          
          {/* Botón Añadir Usuario */}
          {(user?.rol === 'administrador' || user?.rol === 'coordinador') && (
            <button
              onClick={() => setShowAddUserModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              {user?.rol === 'coordinador' ? 'Añadir Agente' : 'Añadir Usuario'}
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 mx-2 sm:mx-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-[#373643]">Filtros</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-[#18cb96] hover:text-[#15b885] font-medium"
          >
            Limpiar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
            />
          </div>

          {user?.rol === 'administrador' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Empresa
              </label>
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                placeholder="Buscar por empresa..."
                className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Fecha de creación
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Toggle para mostrar usuarios por tipo (solo para admins) */}
      {user?.rol === 'administrador' && (
        <div className="mb-4 mx-2 sm:mx-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdmins(!showAdmins)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                showAdmins
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-blue-600 text-white border-blue-600'
              }`}
            >
              {showAdmins ? '👑 Mostrando Administradores' : '🏢 Mostrando Usuarios'}
            </button>
            <span className="text-xs text-gray-500">
              {filteredUsers.length} usuarios mostrados
            </span>
          </div>
        </div>
      )}

      {/* Lista de usuarios - Versión responsive */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mx-2 sm:mx-0">
        {/* Versión desktop - Tabla */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                {user?.rol === 'administrador' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de creación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((userItem) => (
                <tr 
                  key={userItem.user_id} 
                  className="hover:bg-gray-50 transition-all duration-300 ease-in-out"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#18cb96] flex items-center justify-center">
                          <span className="text-white font-semibold text-xs sm:text-sm">
                            {userItem.nombre?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {userItem.nombre || 'Sin nombre'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {userItem.email || 'Sin email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(userItem.rol)}`}>
                      {getRoleLabel(userItem)}
                    </span>
                  </td>
                  {user?.rol === 'administrador' && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(userItem as any)?.empresa?.nombre || 'Sin empresa'}
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(userItem.fecha_creacion)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleUserClick(userItem)}
                      className="text-[#18cb96] hover:text-[#15b885] font-medium"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Versión móvil/tablet - Cards */}
        <div className="lg:hidden">
          {filteredUsers.map((userItem) => (
            <div 
              key={userItem.user_id}
              className="p-3 sm:p-4 border-b border-gray-200 hover:bg-gray-50 transition-all duration-300 ease-in-out"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-[#18cb96] flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {userItem.nombre?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {userItem.nombre || 'Sin nombre'}
                    </div>
                    <button
                      onClick={() => handleUserClick(userItem)}
                      className="text-[#18cb96] hover:text-[#15b885] font-medium text-sm flex-shrink-0 ml-2"
                    >
                      Ver detalles
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 break-all mb-2">
                    {userItem.email || 'Sin email'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(userItem.rol)}`}>
                      {getRoleLabel(userItem)}
                    </span>
                    {user?.rol === 'administrador' && userItem.empresa_id && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {(userItem as any)?.empresas?.nombre || `Empresa ID: ${userItem.empresa_id}`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(userItem.fecha_creacion)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 sm:py-12 transition-all duration-300 ease-in-out animate-fadeIn">
            <p className="text-gray-500 text-sm sm:text-base">No se encontraron usuarios con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Modal de detalles del usuario overlay */}
      {showUserModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowUserModal(false)}
        />
      )}

      {/* Modal de detalles del usuario */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-[#373643]">
                  Detalles del Usuario
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">{user?.rol === 'coordinador' ? 'Información del Agente' : 'Información Personal'}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Nombre</label>
                      <p className="text-sm text-gray-900">{selectedUser.nombre || 'Sin nombre'}</p>
                    </div>
                                          <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm text-gray-900">{selectedUser.email || 'Sin email'}</p>
                      </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Rol</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(selectedUser.rol)}`}>
                         {getRoleLabel(selectedUser)}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Solo mostrar información de empresa para administradores */}
                {user?.rol === 'administrador' && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Información de la Empresa</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-500">ID de Empresa</label>
                        <p className="text-sm text-gray-900">{selectedUser.empresa_id || 'Sin empresa'}</p>
                      </div>
                      {selectedUser.empresa_id && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-500">Nombre de Empresa</label>
                          <p className="text-sm text-gray-900">
                            {(selectedUser as any)?.empresa?.nombre || 'Empresa no encontrada'}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-500">Fecha de Creación</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedUser.fecha_creacion)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {user?.rol === 'coordinador' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Fecha de Creación</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedUser.fecha_creacion)}</p>
                  </div>
                )}
              </div>
            </div>

                          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => handleDeleteUser(selectedUser)}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Eliminar Usuario
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirmModal && userToDelete && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowDeleteConfirmModal(false)}
        />
      )}

      {showDeleteConfirmModal && userToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#373643]">
                  Confirmar Eliminación
                </h3>
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  ¿Estás seguro de que quieres eliminar este usuario?
                </h4>
                <p className="text-sm text-gray-600">
                  Esta acción es <strong>irreversible</strong>. El usuario será eliminado permanentemente del sistema.
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Usuario:</strong> {userToDelete.nombre || 'Sin nombre'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {userToDelete.email || 'Sin email'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Rol:</strong> {getRoleLabel(userToDelete)}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </span>
                ) : (
                  'Eliminar Usuario'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Añadir Usuario */}
      {showAddUserModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowAddUserModal(false)}
        />
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                                 <h3 className="text-base sm:text-lg font-semibold text-[#373643]">
                   {user?.rol === 'coordinador' ? 'Añadir Nuevo Agente' : 'Añadir Nuevo Usuario'}
                 </h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4">
              <form onSubmit={handleAddUser} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={newUser.nombre}
                    onChange={handleInputChange}
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>
                {/* Solo mostrar campo de rol para administradores */}
                {user?.rol === 'administrador' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Rol
                    </label>
                    <select
                      name="rol"
                      value={newUser.rol}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    >
                      <option value="">Seleccionar rol</option>
                      <option value="administrador">Administrador</option>
                      <option value="coordinador">Coordinador</option>
                      <option value="agente">Agente</option>
                    </select>
                  </div>
                )}

                {/* Solo mostrar campo de CIF para administradores cuando no sea admin */}
                {user?.rol === 'administrador' && newUser.rol !== 'administrador' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      CIF de la Empresa
                    </label>
                    <input
                      type="text"
                      name="cif"
                      value={newUser.cif}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: B12345678"
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
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
                      user?.rol === 'coordinador' ? 'Crear Agente' : 'Crear Usuario'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10000] max-w-md w-full mx-4">
          <div className={`rounded-lg shadow-lg p-4 flex items-center justify-between ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100' :
                notification.type === 'error' ? 'bg-red-100' :
                'bg-blue-100'
              }`}>
                {notification.type === 'success' ? (
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : notification.type === 'error' ? (
                  <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className={`ml-3 text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className={`ml-4 flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-400 hover:text-green-600' :
                notification.type === 'error' ? 'text-red-400 hover:text-red-600' :
                'text-blue-400 hover:text-blue-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Usuarios
