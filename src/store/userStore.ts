import { create } from 'zustand'
import { getAllUsers, getUsersByCompany } from '../services/userService'
import type { DatabaseProfile } from '../types/database'

interface UserState {
  // Estado esencial
  users: DatabaseProfile[]
  loading: boolean
  error: string | null
  

  
  // Lógica de negocio esencial
  loadUsers: (userRole: string, userEmpresaId?: number) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  
  // Utilidades
  getUserById: (userId: string) => DatabaseProfile | undefined
  getUsersByCompanyId: (companyId: number) => DatabaseProfile[]
}

export const useUserStore = create<UserState>((set, get) => ({
  // Estado inicial
  users: [],
  loading: false,
  error: null,
  
  // Setters básicos

  
  // Lógica de carga de usuarios
  loadUsers: async (userRole: string, userEmpresaId?: number) => {
    try {
      set({ loading: true, error: null })
      
      let usersData: DatabaseProfile[]
      
      if (userRole === 'administrador') {
        // Los administradores ven todos los usuarios
        usersData = await getAllUsers()
      } else if (userRole === 'coordinador' && userEmpresaId) {
        // Los coordinadores ven solo los usuarios de su empresa (agentes)
        usersData = await getUsersByCompany(userEmpresaId)
        // Filtrar para mostrar solo agentes (no coordinadores ni administradores)
        usersData = usersData.filter(user => user.rol === 'agente')
      } else if (userEmpresaId) {
        // Otros roles ven usuarios de su empresa
        usersData = await getUsersByCompany(userEmpresaId)
      } else {
        usersData = []
      }
      
      set({ users: usersData })
    } catch (err) {
      console.error('Error loading users:', err)
      set({ error: 'Error al cargar los usuarios' })
    } finally {
      set({ loading: false })
    }
  },

  // Función para eliminar usuario
  deleteUser: async (userId: string) => {
    try {
      set({ loading: true, error: null })
      
      // Importar userService dinámicamente para evitar dependencias circulares
      const { userService } = await import('../services/userService')
      
      // Eliminar usuario del backend
      await userService.deleteUser(userId)
      
      // Eliminar usuario del estado local
      set(state => ({
        users: state.users.filter(user => user.user_id !== userId)
      }))
      
    } catch (err) {
      console.error('Error deleting user:', err)
      set({ error: 'Error al eliminar el usuario' })
    } finally {
      set({ loading: false })
    }
  },
  
  // Utilidades
  getUserById: (userId: string) => {
    return get().users.find(user => user.user_id === userId)
  },
  
  getUsersByCompanyId: (companyId: number) => {
    return get().users.filter(user => user.empresa_id === companyId)
  }
}))
