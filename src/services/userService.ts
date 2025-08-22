import axiosInstance from '../api/axiosConfig'
import { supabase } from '../lib/supabase'
import type { DatabaseProfile } from '../types/database'


export interface NewUserData {
  nombre: string
  email: string
  empresa: string // Puede ser el ID de la empresa o vacío para admins
  rol: string // Frontend format
}

export interface UserDataForBackend {
  name: string
  email: string
  empresa_id?: number // Opcional para admins
  role: string // Backend format
  redirectTo: string
}

export interface RegisterResponse {
  success: boolean
  message: string
  userId?: string
}

export const userService = {
  /**
   * Registra un nuevo usuario enviando una invitación por email
   * @param userData - Datos del nuevo usuario (formato frontend)
   * @returns Promise con la respuesta del servidor
   */
  registerUser: async (userData: NewUserData): Promise<RegisterResponse> => {
    try {
      // Obtener la sesión actual para obtener el JWT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error('Error al obtener la sesión: ' + sessionError.message)
      }

      if (!session) {
        throw new Error('No hay sesión activa. Debes estar autenticado para crear usuarios.')
      }

      // Obtener el token de acceso
      const accessToken = session.access_token

      // Convertir formato frontend a backend
      const backendData: UserDataForBackend = {
        name: userData.nombre,
        email: userData.email,
        role: userData.rol,
        redirectTo: 'https://scalehubs.vercel.app//set-password'
      }

      // Solo incluir empresa_id si es un cliente y tiene empresa
      if (userData.rol === 'client' && userData.empresa) {
        backendData.empresa_id = parseInt(userData.empresa)
      }

      // Realizar la petición POST con el header Bearer
      const response = await axiosInstance.post(
        import.meta.env.VITE_SUPABASE_URL_INVITE_USER, 
        backendData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      
      return response.data
    } catch (error: any) {
      console.error('Error completo:', error)
      
      // Manejar errores específicos
      if (error.message?.includes('sesión')) {
        throw new Error(error.message)
      } else if (error.response?.status === 409) {
        throw new Error('El email ya está registrado')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Datos inválidos')
      } else if (error.response?.status === 401) {
        throw new Error('No tienes permisos para realizar esta acción. Verifica que seas administrador.')
      } else if (error.response?.status === 403) {
        throw new Error('Acceso denegado. No tienes permisos para crear usuarios.')
      } else if (error.response?.status === 500) {
        throw new Error('Error interno del servidor')
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Error de conexión. Verifica tu conexión a internet.')
      } else {
        throw new Error('Error al registrar el usuario: ' + (error.message || 'Error desconocido'))
      }
    }
  },

  /**
   * Obtiene la lista de usuarios (si es necesario en el futuro)
   */
  getUsers: async () => {
    try {
      // Obtener la sesión actual para obtener el JWT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error('Error al obtener la sesión: ' + sessionError.message)
      }

      if (!session) {
        throw new Error('No hay sesión activa.')
      }

      const accessToken = session.access_token

      const response = await axiosInstance.get('/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error: any) {
      throw new Error('Error al obtener usuarios: ' + (error.message || 'Error desconocido'))
    }
  }
} 

// Función para obtener todos los usuarios (solo para admins)
export const getAllUsers = async (): Promise<DatabaseProfile[]> => {
  try {
    const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      empresa:empresas!profiles_empresa_id_fkey (
        id,
        nombre,
        cif
      )
    `)
      .order('fecha_creacion', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    throw error
  }
}

// Función para obtener usuarios por empresa (para clientes)
export const getUsersByCompany = async (empresaId: number): Promise<DatabaseProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_creacion', { ascending: false })

    if (error) {
      console.error('Error fetching company users:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getUsersByCompany:', error)
    throw error
  }
} 