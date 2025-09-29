import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsSection = 'personal' | 'privacidad' | 'empresa'

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { user, userEmpresaConfiguracion, updatePassword, updateEmpresaConfiguracion } = useAuthStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('personal')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados para datos personales
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Estados para configuración de empresa
  const [maxSolicitudes, setMaxSolicitudes] = useState(
    userEmpresaConfiguracion?.maxSolicitudesPorAgente || 1
  )
  const [solicitudesAutomaticas, setSolicitudesAutomaticas] = useState(
    userEmpresaConfiguracion?.solicitudesAutomaticas || false
  )

  // Limpiar mensajes al cambiar de sección
  useEffect(() => {
    setError(null)
    setSuccess(null)
  }, [activeSection])

  // Limpiar mensaje de éxito después de 5 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [success])

  if (!isOpen) return null

  const handlePrivacidadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }

      if (newPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres')
      }

      await updatePassword(newPassword)
      setSuccess('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (maxSolicitudes < 1 || maxSolicitudes > 3) {
        throw new Error('El máximo de solicitudes debe estar entre 1 y 3')
      }

      await updateEmpresaConfiguracion({
        maxSolicitudesPorAgente: maxSolicitudes,
        solicitudesAutomaticas: solicitudesAutomaticas,
        maximoAgentes: userEmpresaConfiguracion?.maximoAgentes || 1
      })
      setSuccess('Configuración de empresa actualizada correctamente')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar la configuración')
    } finally {
      setIsLoading(false)
    }
  }

  const isCoordinador = user?.rol === 'coordinador'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black opacity-50 z-51"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col sm:flex-row">
        {/* Sidebar izquierdo */}
        <div className="w-full sm:w-64 bg-gray-50 border-b sm:border-b-0 sm:border-r border-gray-200 p-4 rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl">
          <h2 className="text-lg font-semibold text-[#373643] mb-4 sm:mb-6">Configuración</h2>
          <nav className="space-y-1 sm:space-y-2">
            <button
              onClick={() => setActiveSection('personal')}
              className={`w-full text-left px-3 py-2 sm:py-2 rounded-xl transition-colors text-sm sm:text-base ${
                activeSection === 'personal'
                  ? 'bg-[#18cb96] text-white'
                  : 'text-[#373643] hover:bg-gray-200'
              }`}
            >
              👤 Datos Personales
            </button>
            <button
              onClick={() => setActiveSection('privacidad')}
              className={`w-full text-left px-3 py-2 sm:py-2 rounded-xl transition-colors text-sm sm:text-base ${
                activeSection === 'privacidad'
                  ? 'bg-[#18cb96] text-white'
                  : 'text-[#373643] hover:bg-gray-200'
              }`}
            >
              🔒 Privacidad
            </button>
            {isCoordinador && (
              <button
                onClick={() => setActiveSection('empresa')}
                className={`w-full text-left px-3 py-2 sm:py-2 rounded-xl transition-colors text-sm sm:text-base ${
                  activeSection === 'empresa'
                    ? 'bg-[#18cb96] text-white'
                    : 'text-[#373643] hover:bg-gray-200'
                }`}
              >
                🏢 Configuración de Empresa
              </button>
            )}
          </nav>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-[#373643]">
              {activeSection === 'personal' ? 'Datos Personales' : 
               activeSection === 'privacidad' ? 'Privacidad' : 
               'Configuración de Empresa'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mensajes de error y éxito */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl">
              {success}
            </div>
          )}

          {/* Sección de datos personales */}
          {activeSection === 'personal' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                <h4 className="text-lg font-medium text-[#373643] mb-4">Información Personal</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-[#373643]">
                      {user?.nombre || 'No especificado'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-[#373643]">
                      {user?.email || 'No especificado'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol
                    </label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-[#373643] capitalize">
                      {user?.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : 'No especificado'}
                    </div>
                  </div>
                  
                  {user?.empresa && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa
                      </label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-[#373643]">
                        {user.empresa}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Información de solo lectura
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Los datos personales mostrados aquí son de solo lectura. Para cambiar tu contraseña, ve a la sección de Privacidad.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección de privacidad */}
          {activeSection === 'privacidad' && (
            <form onSubmit={handlePrivacidadSubmit} className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                <h4 className="text-lg font-medium text-[#373643] mb-4">Cambiar Contraseña</h4>
                <p className="text-sm text-gray-600 mb-6">
                  Para cambiar tu contraseña, ingresa tu contraseña actual y la nueva contraseña que deseas usar.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      placeholder="Ingresa tu contraseña actual"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      placeholder="Ingresa tu nueva contraseña"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      La contraseña debe tener al menos 6 caracteres
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      placeholder="Confirma tu nueva contraseña"
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full mt-6 bg-[#18cb96] text-white py-2 px-4 rounded-xl hover:bg-[#15b085] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          )}

          {/* Sección de configuración de empresa */}
          {activeSection === 'empresa' && isCoordinador && (
            <form onSubmit={handleEmpresaSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#373643] mb-2">
                  Máximo de solicitudes por agente
                </label>
                <select
                  value={maxSolicitudes}
                  onChange={(e) => setMaxSolicitudes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                >
                  <option value={1}>1 solicitud</option>
                  <option value={2}>2 solicitudes</option>
                  <option value={3}>3 solicitudes</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Número máximo de solicitudes de leads que puede crear cada agente al mismo tiempo
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={solicitudesAutomaticas}
                    onChange={(e) => setSolicitudesAutomaticas(e.target.checked)}
                    className="h-4 w-4 text-[#18cb96] focus:ring-[#18cb96] border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-[#373643]">
                    Aceptar solicitudes automáticamente
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Si está activado, las solicitudes de leads se aprobarán automáticamente sin revisión manual
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#18cb96] text-white py-2 px-4 rounded-xl hover:bg-[#15b085] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </form>
          )}
        </div>
        </div>
      </div>
    </>
  )
}

export default SettingsModal
