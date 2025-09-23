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


      {/* Welcome Message */}
      <div className="mt-6 lg:mt-8">
        <div className="bg-gradient-to-r from-[#18cb96] to-[#15b885] rounded-lg shadow-md p-6 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">¡Bienvenido a ScaleHubs!</h2>
            <p className="text-lg opacity-90 mb-4">
              Tu plataforma integral para la gestión eficiente de leads y el crecimiento de tu negocio
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm opacity-80">
              <span className="bg-white text-black font-bold hover:scale-105 transition-all transform bg-opacity-20 px-3 py-1 rounded-full">🚀 Gestión de Leads</span>
              <span className="bg-white text-black font-bold hover:scale-105 transition-all transform bg-opacity-20 px-3 py-1 rounded-full">📊 Analytics</span>
              <span className="bg-white text-black font-bold hover:scale-105 transition-all transform bg-opacity-20 px-3 py-1 rounded-full">🔄 Devoluciones</span>
              <span className="bg-white text-black font-bold hover:scale-105 transition-all transform bg-opacity-20 px-3 py-1 rounded-full">👥 Usuarios</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
