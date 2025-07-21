import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '' // CIF de la empresa (para enviar al backend)
  })
  const [userMetadata, setUserMetadata] = useState({
    name: '',
    companyName: '', // Nombre de la empresa para mostrar
    role: 'client' as 'admin' | 'client'
  })
  const [passwordError, setPasswordError] = useState('')
  const [isValidHash, setIsValidHash] = useState(false)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true)

  const { signup, isLoading, error, clearError, isAuthenticated } = useAuthStore()

  // Verificar si hay hash en la URL y obtener metadata
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash === '') {
      navigate('/')
      return
    }
    
    const getSessionAndMetadata = async () => {
      try {
        setIsLoadingMetadata(true)
        
        // Obtener sesión y metadata desde la URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          navigate('/')
          return
        }

        if (data.session?.user) {
          // Verificar si el usuario ya está autenticado
          navigate('/')
          return
        }

        // Obtener metadata del usuario invitado
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('Error getting user:', userError)
          navigate('/')
          return
        }

        // Extraer datos del metadata
        const metadata = user.user_metadata || {}
        const name = metadata.name || ''
        const companyCif = metadata.company || ''
        const role = metadata.role || 'client'

        // Obtener el nombre de la empresa por CIF
        let companyName = ''
        if (companyCif) {
          const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .select('nombre')
            .eq('cif', companyCif)
            .single()
          
          if (!empresaError && empresa) {
            companyName = empresa.nombre
          }
        }

        // Actualizar estado con los datos obtenidos
        setUserMetadata({
          name,
          companyName,
          role
        })

        setFormData(prev => ({
          ...prev,
          name,
          company: companyCif,
          email: user.email || ''
        }))

        setIsValidHash(true)
        clearError()
      } catch (error) {
        console.error('Error in getSessionAndMetadata:', error)
        navigate('/')
      } finally {
        setIsLoadingMetadata(false)
      }
    }
    
    getSessionAndMetadata()
  }, [navigate, clearError])

  // Redirect to platform when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const validatePassword = (password: string, confirmPassword: string) => {
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres'
    }
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden'
    }
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar contraseñas
    const passwordValidation = validatePassword(formData.password, formData.confirmPassword)
    if (passwordValidation) {
      setPasswordError(passwordValidation)
      return
    }

    setPasswordError('')

    try {
      await signup(formData.email, formData.password, {
        name: formData.name,
        company: formData.company,
        role: userMetadata.role
      })
    } catch (error) {
      console.error('Register error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir cambios en password y confirmPassword
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      })
      setPasswordError('')
    }
  }

  // Si no hay hash válido o está cargando metadata, no mostrar nada
  if (!isValidHash || isLoadingMetadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#18cb96] to-[#15b885] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#18cb96] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando información de invitación...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18cb96] to-[#15b885] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#373643]">
            <span className="text-[#18cb96]">Scale</span>Hubs
          </h1>
          <p className="text-gray-600 mt-2">
            Configura tu cuenta
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Has sido invitado a unirte a la plataforma
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Password Error Message */}
        {passwordError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{passwordError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#373643] mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={userMetadata.name}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Tu nombre completo"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este dato fue proporcionado en tu invitación
            </p>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-[#373643] mb-2">
              Empresa
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={userMetadata.companyName}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Nombre de la empresa"
            />
            <p className="text-xs text-gray-500 mt-1">
              Empresa asignada en tu invitación
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#373643] mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="tu@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email de tu invitación
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#373643] mb-2">
              Contraseña *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 6 caracteres
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#373643] mb-2">
              Confirmar contraseña *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#18cb96] text-white font-medium py-3 px-4 rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creando cuenta...
              </span>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">🔒 Seguridad</h3>
          <ul className="space-y-1 text-xs text-blue-700">
            <li>• Tu contraseña se almacena de forma segura</li>
            <li>• Solo puedes registrarte con el enlace de invitación</li>
            <li>• Tus datos están protegidos con encriptación</li>
          </ul>
        </div>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-[#373643] mb-3">¿Por qué ScaleHubs?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-[#18cb96] mr-2">✓</span>
              Gestión inteligente de leads
            </li>
            <li className="flex items-center">
              <span className="text-[#18cb96] mr-2">✓</span>
              Análisis en tiempo real
            </li>
            <li className="flex items-center">
              <span className="text-[#18cb96] mr-2">✓</span>
              Integración con redes sociales
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Register 