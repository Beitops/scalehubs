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
      
      if (userRole === 'admin') {
        usersData = await getAllUsers()
      } else if (userEmpresaId) {
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
  
  // Utilidades
  getUserById: (userId: string) => {
    return get().users.find(user => user.user_id === userId)
  },
  
  getUsersByCompanyId: (companyId: number) => {
    return get().users.filter(user => user.empresa_id === companyId)
  }
}))
