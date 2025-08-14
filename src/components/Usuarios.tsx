import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getAllUsers, getUsersByCompany } from '../services/userService'
import type { DatabaseProfile } from '../types/database'

interface UsuariosProps {}

const Usuarios = ({}: UsuariosProps) => {
  const [users, setUsers] = useState<DatabaseProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<DatabaseProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdminUsers, setShowAdminUsers] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<DatabaseProfile | null>(null)
  
  // Filtros
  const [nameFilter, setNameFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { user, userEmpresaId } = useAuthStore()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, nameFilter, roleFilter, companyFilter, dateFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let usersData: DatabaseProfile[]
      
      if (user?.role === 'admin') {
        usersData = await getAllUsers()
      } else if (userEmpresaId) {
        usersData = await getUsersByCompany(userEmpresaId)
      } else {
        usersData = []
      }
      
      setUsers(usersData)
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Error al cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    // Filtro por nombre
    if (nameFilter) {
      filtered = filtered.filter(user => 
        user.nombre?.toLowerCase().includes(nameFilter.toLowerCase())
      )
    }

    // Filtro por rol
    if (roleFilter) {
      if (roleFilter === 'admin') {
        filtered = filtered.filter(user => user.es_admin)
      } else if (roleFilter === 'client') {
        filtered = filtered.filter(user => !user.es_admin)
      }
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
            onClick={loadUsers}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Usuarios</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          {user?.role === 'admin' 
            ? 'Gestión de usuarios del sistema' 
            : 'Usuarios de tu empresa'
          }
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#373643] mb-4">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="client">Clientes</option>
            </select>
          </div>

          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa
              </label>
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                placeholder="Buscar por empresa..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de creación
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Toggle para mostrar usuarios admin (solo para admins) */}
      {user?.role === 'admin' && (
        <div className="mb-4 flex items-center">
          <button
            onClick={() => setShowAdminUsers(!showAdminUsers)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              showAdminUsers 
                ? 'bg-purple-100 text-purple-700 border-purple-300' 
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {showAdminUsers ? '👑 Ocultar admins' : '👑 Mostrar admins'}
          </button>
          <span className="ml-2 text-xs text-gray-500">
            {users.filter(u => u.es_admin).length} administradores
          </span>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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
              {filteredUsers
                .filter(user => showAdminUsers || !user.es_admin)
                .map((userItem) => (
                  <tr key={userItem.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-[#18cb96] flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {userItem.nombre?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.nombre || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
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
                        {(userItem as any)?.empresas?.nombre || 'Sin empresa'}
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

        {filteredUsers.filter(user => showAdminUsers || !user.es_admin).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron usuarios con los filtros aplicados</p>
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
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#373643]">
                  Detalles del Usuario
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información Personal</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Nombre</label>
                      <p className="text-sm text-gray-900">{selectedUser.nombre || 'Sin nombre'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">ID de Usuario</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedUser.user_id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Rol</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(selectedUser.es_admin)}`}>
                        {getRoleLabel(selectedUser.es_admin)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información de la Empresa</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">ID de Empresa</label>
                      <p className="text-sm text-gray-900">{selectedUser.empresa_id || 'Sin empresa'}</p>
                    </div>
                    {user?.role === 'admin' && selectedUser.empresa_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Nombre de Empresa</label>
                        <p className="text-sm text-gray-900">
                          {(selectedUser as any)?.empresas?.nombre || 'Empresa no encontrada'}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Fecha de Creación</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedUser.fecha_creacion)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  // TODO: Implementar edición de usuario
                  console.log('Editar usuario:', selectedUser.user_id)
                }}
                className="px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors"
              >
                Editar Usuario
              </button>
              <button
                onClick={() => {
                  // TODO: Implementar eliminación de usuario
                  console.log('Eliminar usuario:', selectedUser.user_id)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
