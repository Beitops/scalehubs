import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const MenuLeads = () => {
  const { user } = useAuthStore()

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Leads Activos */}
        <Link 
          to="/leads/activos"
          className="group block h-full"
        >
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-transparent hover:border-[#18cb96] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 h-full flex flex-col">
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
            
            <p className="text-gray-600 text-sm mb-4 flex-grow">
              {user?.rol === 'administrador' 
                ? 'Visualiza y gestiona todos los leads activos del sistema'
                : user?.rol === 'coordinador'
                ? 'Gestiona todos los leads activos de tu empresa'
                : 'Revisa los leads activos asignados a ti'
              }
            </p>
            
            <div className="flex items-center text-[#18cb96] font-medium text-sm group-hover:text-[#15b885] transition-colors mt-auto">
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
          className="group block h-full"
        >
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-transparent hover:border-[#18cb96] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 h-full flex flex-col">
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
            
            <p className="text-gray-600 text-sm mb-4 flex-grow">
              {user?.rol === 'administrador' 
                ? 'Consulta el historial completo de todos los leads procesados'
                : user?.rol === 'coordinador'
                ? 'Revisa el historial de leads de tu empresa'
                : 'Accede al historial de tus leads procesados'
              }
            </p>
            
            <div className="flex items-center text-[#18cb96] font-medium text-sm group-hover:text-[#15b885] transition-colors mt-auto">
              Ver historial
              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Devoluciones */}
        <Link 
          to="/leads/devoluciones"
          className="group block h-full"
        >
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-transparent hover:border-[#18cb96] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#18cb96] rounded-lg flex items-center justify-center">
                <span className="text-2xl text-white">📦</span>
              </div>
              <div className="text-right">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-[#18cb96] bg-[#18cb96]/10">
                  Devoluciones
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-[#373643] mb-2 group-hover:text-[#18cb96] transition-colors">
              Devoluciones
            </h3>
            
            <p className="text-gray-600 text-sm mb-4 flex-grow">
              {user?.rol === 'administrador' 
                ? 'Gestiona todas las devoluciones del sistema'
                : user?.rol === 'coordinador'
                ? 'Revisa las devoluciones de tu empresa'
                : 'Accede a tus devoluciones pendientes'
              }
            </p>
            
            <div className="flex items-center text-[#18cb96] font-medium text-sm group-hover:text-[#15b885] transition-colors mt-auto">
              Ver devoluciones
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
