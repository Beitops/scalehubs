import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const MenuLeads = () => {
  const { user, userEmpresaNombre } = useAuthStore()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Gestión de Leads</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          {user?.rol === 'administrador' 
            ? 'Administra y visualiza todos los leads del sistema' 
            : `Gestiona los leads de ${userEmpresaNombre || 'tu empresa'}`
          }
        </p>
        {user?.rol === 'administrador' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs">
              👑 <strong>Modo Administrador:</strong> Acceso completo a todos los leads
            </p>
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Leads Activos */}
        <Link 
          to="/leads/activos"
          className="group block"
        >
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-transparent hover:border-[#18cb96] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#18cb96] rounded-lg flex items-center justify-center">
                <span className="text-2xl text-white">📊</span>
              </div>
              <div className="text-right">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-[#18cb96] bg-[#18cb96]/10">
                  Activos
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[#373643] mb-2 group-hover:text-[#18cb96] transition-colors">
              Leads Activos
            </h3>
            
            <p className="text-gray-600 text-sm mb-4">
              {user?.rol === 'administrador' 
                ? 'Visualiza y gestiona todos los leads activos del sistema'
                : user?.rol === 'coordinador'
                ? 'Gestiona todos los leads activos de tu empresa'
                : 'Revisa los leads activos asignados a ti'
              }
            </p>
            
            <div className="flex items-center text-[#18cb96] font-medium text-sm group-hover:text-[#15b885] transition-colors">
              Ver leads activos
              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Historial de Leads */}
        <Link 
          to="/leads/historial"
          className="group block"
        >
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-transparent hover:border-[#18cb96] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#18cb96] rounded-lg flex items-center justify-center">
                <span className="text-2xl text-white">📈</span>
              </div>
              <div className="text-right">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-[#18cb96] bg-[#18cb96]/10">
                  Historial
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[#373643] mb-2 group-hover:text-[#18cb96] transition-colors">
              Historial de Leads
            </h3>
            
            <p className="text-gray-600 text-sm mb-4">
              {user?.rol === 'administrador' 
                ? 'Consulta el historial completo de todos los leads procesados'
                : user?.rol === 'coordinador'
                ? 'Revisa el historial de leads de tu empresa'
                : 'Accede al historial de tus leads procesados'
              }
            </p>
            
            <div className="flex items-center text-[#18cb96] font-medium text-sm group-hover:text-[#15b885] transition-colors">
              Ver historial
              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default MenuLeads
