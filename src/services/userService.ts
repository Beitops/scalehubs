import axiosInstance from '../api/axiosConfig'
import { roleConverter } from '../utils/roleConverter'

export interface NewUserData {
  name: string
  email: string
  company: string // CIF de la empresa
  role: 'admin' | 'client' // Frontend format
}

export interface UserDataForBackend {
  name: string
  email: string
  cif: string // CIF de la empresa
  isAdmin: boolean // Backend format
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
      // Convertir formato frontend a backend
      const backendData: UserDataForBackend = {
        name: userData.name,
        email: userData.email,
        cif: userData.company, // CIF de la empresa
        isAdmin: roleConverter.frontendToBackend(userData.role)
      }

      const response = await axiosInstance.post('/register', backendData)
      return response.data
    } catch (error: any) {
      // Manejar errores específicos
      if (error.response?.status === 409) {
        throw new Error('El email ya está registrado')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Datos inválidos')
      } else if (error.response?.status === 401) {
        throw new Error('No tienes permisos para realizar esta acción')
      } else if (error.response?.status === 500) {
        throw new Error('Error interno del servidor')
      } else {
        throw new Error('Error al registrar el usuario')
      }
    }
  },

  /**
   * Obtiene la lista de usuarios (si es necesario en el futuro)
   */
  getUsers: async () => {
    try {
      const response = await axiosInstance.get('/users')
      return response.data
    } catch (error: any) {
      throw new Error('Error al obtener usuarios')
    }
  }
} 