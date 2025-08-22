
import { NavLink } from 'react-router-dom'
import CompanyName from './CompanyName'

import { useAuthStore } from '../store/authStore'

interface SidebarProps {
  onClose: () => void
  sidebarOpen?: boolean
  onLogout?: () => void
  onAddUser?: () => void
}

const Sidebar = ({ onClose, onLogout, onAddUser }: SidebarProps) => {

  const { user } = useAuthStore()

  // Menú base para todos los usuarios
  const baseMenuItems = [
    { id: 'home', label: 'Inicio', icon: '🏠', to: '/' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', to: '/dashboard' },
    { id: 'leads', label: 'Leads', icon: '👥', to: '/leads' },
    { id: 'devoluciones', label: 'Devoluciones', icon: '📦', to: '/devoluciones' },
  ];

  const adminMenuItems = [
    { id: 'empresas', label: 'Empresas', icon: '🏢', to: '/empresas' },
    { id: 'usuarios', label: 'Usuarios', icon: '👤', to: '/usuarios' },
  ];

  const menuItems = user?.rol === 'administrador'
    ? [...baseMenuItems, ...adminMenuItems]
    : baseMenuItems;

  const handleMenuClick = () => {
    // Close sidebar on mobile after menu selection
    onClose()
  }

  return (
    <div className="w-64 bg-white shadow-lg h-full flex flex-col">
      {/* Header with close button for mobile */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#373643]">
          <span className="text-[#18cb96]">Scale</span>Hubs
        </h1>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden text-[#373643] hover:text-[#18cb96] focus:outline-none"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6 flex-1">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                onClick={() => handleMenuClick()}
                end={item.id === 'dashboard'}
                className={({ isActive }) =>
                  `w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${isActive
                    ? 'bg-[#18cb96] text-white'
                    : 'text-[#373643] hover:bg-gray-100'
                  }`
                }
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Add User Button (Admin Only) */}
              {user?.rol === 'administrador' && onAddUser && (
        <div className="px-4 mb-4">
          <button
            onClick={onAddUser}
            className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors bg-[#18cb96] text-white hover:bg-[#15b885]"
          >
            <span className="mr-3 text-3xl text-white">+</span>
            <span className="font-medium">Añadir usuarios</span>
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-[#18cb96] rounded-full flex items-center justify-center text-white font-bold">
            {user?.nombre?.charAt(0) || 'U'}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-[#373643] truncate">{user?.nombre || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || 'usuario@empresa.com'}</p>
            {user?.rol !== 'administrador' && (
              <p className="text-xs text-gray-400 truncate">
                <CompanyName cif={user?.empresa} />
              </p>
            )}
            <p className="text-xs text-[#18cb96] font-medium capitalize">
              {user?.rol === 'administrador' ? '👑 Administrador' : '👤 Cliente'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span className="mr-2">🚪</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default Sidebar 