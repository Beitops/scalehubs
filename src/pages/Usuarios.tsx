import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'
import type { DatabaseProfile } from '../types/database'

interface UsuariosProps {}

const Usuarios = ({}: UsuariosProps) => {
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<DatabaseProfile | null>(null)
  
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
    loadUsers
  } = useUserStore()

  console.log('users', users)

  useEffect(() => {
    if (user?.role && (user.role === 'admin' || userEmpresaId)) {
      loadUsers(user.role, userEmpresaId || undefined)
    }
  }, [user?.role, userEmpresaId, loadUsers])

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
      filtered = filtered.filter(user => user.es_admin)
    } else {
      filtered = filtered.filter(user => !user.es_admin)
    }

    // Filtro por empresa (solo para admins)
    if (companyFilter && user?.role === 'admin') {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleLabel = (isAdmin: boolean) => {
    return isAdmin ? 'Administrador' : 'Cliente'
  }

  const getRoleColor = (isAdmin: boolean) => {
    return isAdmin 
      ? 'bg-purple-100 text-purple-800 border-purple-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200'
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
            onClick={() => loadUsers(user?.role || '', userEmpresaId || undefined)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  console.log('filteredUsers', filteredUsers)

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8 mx-2 sm:mx-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#373643]">Usuarios</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
          {user?.role === 'admin' 
            ? 'Gestión de usuarios del sistema' 
            : 'Usuarios de tu empresa'
          }
        </p>
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

          {user?.role === 'admin' && (
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
      {user?.role === 'admin' && (
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
              {showAdmins ? '👑 Mostrando Admins' : '🏢 Mostrando Clientes'}
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
                {user?.role === 'admin' && (
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
                          {userItem.user_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(userItem.es_admin)}`}>
                      {getRoleLabel(userItem.es_admin)}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
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
                    {userItem.user_id}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(userItem.es_admin)}`}>
                      {getRoleLabel(userItem.es_admin)}
                    </span>
                    {user?.role === 'admin' && userItem.empresa_id && (
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
                  <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Información Personal</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Nombre</label>
                      <p className="text-sm text-gray-900">{selectedUser.nombre || 'Sin nombre'}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">ID de Usuario</label>
                      <p className="text-sm text-gray-900 font-mono break-all">{selectedUser.user_id}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Rol</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(selectedUser.es_admin)}`}>
                        {getRoleLabel(selectedUser.es_admin)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Información de la Empresa</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">ID de Empresa</label>
                      <p className="text-sm text-gray-900">{selectedUser.empresa_id || 'Sin empresa'}</p>
                    </div>
                    {user?.role === 'admin' && selectedUser.empresa_id && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-500">Nombre de Empresa</label>
                        <p className="text-sm text-gray-900">
                          {(selectedUser as any)?.empresas?.nombre || 'Empresa no encontrada'}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Fecha de Creación</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedUser.fecha_creacion)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  // TODO: Implementar edición de usuario
                  console.log('Editar usuario:', selectedUser.user_id)
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors text-sm"
              >
                Editar Usuario
              </button>
              <button
                onClick={() => {
                  // TODO: Implementar eliminación de usuario
                  console.log('Eliminar usuario:', selectedUser.user_id)
                }}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Usuarios
