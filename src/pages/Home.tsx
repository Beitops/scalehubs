import { useAuthStore } from '../store/authStore'

const Home = () => {
  console.log('Home')
  const { user, userEmpresaNombre } = useAuthStore()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Bienvenido a ScaleHubs</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
                      {user?.rol === 'administrador'
              ? 'Tu plataforma central para la gestión integral de leads y empresas'
              : `Bienvenido a ${userEmpresaNombre || user?.empresa || 'tu empresa'} en ScaleHubs`
            }
        </p>
        {user?.rol === 'administrador' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs">
              👑 <strong>Modo Administrador:</strong> Acceso completo al sistema
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-[#18cb96] rounded-lg flex items-center justify-center text-white text-2xl mr-4">
              🏠
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#373643]">Página de Inicio</h2>
              <p className="text-gray-600 text-sm">Tu punto de partida en ScaleHubs</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Esta es la página principal de tu aplicación ScaleHubs. Desde aquí puedes acceder a todas las funcionalidades disponibles según tu rol en el sistema.
            </p>
            
            {user?.rol === 'administrador' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Funcionalidades de Administrador:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Gestión completa de leads del sistema</li>
                  <li>• Administración de empresas y usuarios</li>
                  <li>• Visualización de estadísticas globales</li>
                  <li>• Control de devoluciones y trámites</li>
                </ul>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Funcionalidades de Cliente:</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Visualización de leads asignados a tu empresa</li>
                  <li>• Gestión de devoluciones</li>
                  <li>• Estadísticas de tu empresa</li>
                  <li>• Exportación de datos</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#373643] mb-4">Acciones Rápidas</h2>
          
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-[#18cb96] rounded-lg flex items-center justify-center text-white text-sm mr-3">
                📊
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#373643] text-sm">Ver Dashboard</p>
                <p className="text-gray-600 text-xs">Resumen de estadísticas y métricas</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-[#18cb96] rounded-lg flex items-center justify-center text-white text-sm mr-3">
                📋
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#373643] text-sm">Gestionar Leads</p>
                <p className="text-gray-600 text-xs">Ver y administrar leads del sistema</p>
              </div>
            </div>

            {user?.rol === 'administrador' && (
              <>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-[#18cb96] rounded-lg flex items-center justify-center text-white text-sm mr-3">
                    🏢
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#373643] text-sm">Gestionar Empresas</p>
                    <p className="text-gray-600 text-xs">Administrar empresas del sistema</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-[#18cb96] rounded-lg flex items-center justify-center text-white text-sm mr-3">
                    👥
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#373643] text-sm">Gestionar Usuarios</p>
                    <p className="text-gray-600 text-xs">Administrar usuarios del sistema</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-[#18cb96] rounded-lg flex items-center justify-center text-white text-sm mr-3">
                🔄
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#373643] text-sm">Ver Devoluciones</p>
                <p className="text-gray-600 text-xs">Gestionar trámites de devolución</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-6 lg:mt-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-[#373643] mb-4">Información del Sistema</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-[#18cb96] mb-1">
                {user?.rol === 'administrador' ? '👑' : '🏢'}
              </div>
              <p className="text-sm font-medium text-[#373643]">Rol</p>
              <p className="text-xs text-gray-600 capitalize">{user?.rol || 'N/A'}</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-[#18cb96] mb-1">
                📧
              </div>
              <p className="text-sm font-medium text-[#373643]">Email</p>
              <p className="text-xs text-gray-600 truncate">{user?.email || 'N/A'}</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-[#18cb96] mb-1">
                🕒
              </div>
              <p className="text-sm font-medium text-[#373643]">Último Acceso</p>
              <p className="text-xs text-gray-600">
                Hoy
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-[#18cb96] mb-1">
                ⚡
              </div>
              <p className="text-sm font-medium text-[#373643]">Estado</p>
              <p className="text-xs text-green-600 font-medium">Activo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="mt-6 lg:mt-8">
        <div className="bg-gradient-to-r from-[#18cb96] to-[#15b885] rounded-lg shadow-md p-6 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">¡Bienvenido a ScaleHubs!</h2>
            <p className="text-lg opacity-90 mb-4">
              Tu plataforma integral para la gestión eficiente de leads y el crecimiento de tu negocio
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm opacity-80">
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">🚀 Gestión de Leads</span>
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">📊 Analytics</span>
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">🔄 Devoluciones</span>
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">👥 Usuarios</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
