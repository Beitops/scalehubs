import { create } from 'zustand'
import { getAllUsers, getUsersByCompany } from '../services/userService'
import type { DatabaseProfile } from '../types/database'
import { supabase } from '../lib/supabase'

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
  
  // Validación de agentes
  getAgentesCountByEmpresa: (empresaId: number) => Promise<number>
  canAddAgente: (empresaId: number) => Promise<{ canAdd: boolean; currentCount: number; maxAgentes: number }>
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
  },

  // Validación de agentes
  getAgentesCountByEmpresa: async (empresaId: number) => {
    try {
      // Obtener el ID del rol 'agente'
      const { data: rolAgente, error: rolError } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', 'agente')
        .single()

      if (rolError || !rolAgente) {
        throw new Error('No se pudo obtener el rol de agente')
      }

      // Contar agentes de la empresa
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('rol_id', rolAgente.id)

      if (countError) {
        throw new Error(countError.message)
      }

      return count || 0
    } catch (error) {
      throw error
    }
  },

  canAddAgente: async (empresaId: number) => {
    try {
      // Obtener configuración de la empresa
      const { data: configData, error: configError } = await supabase
        .from('configuraciones_empresa')
        .select('configuraciones')
        .eq('empresa_id', empresaId)
        .single()
      
      let maxAgentes = 1 // Valor por defecto
      
      if (!configError && configData?.configuraciones) {
        const config = configData.configuraciones as any
        maxAgentes = config.maximoAgentes || 1
      }

      // Contar agentes actuales
      const currentCount = await get().getAgentesCountByEmpresa(empresaId)

      return {
        canAdd: currentCount < maxAgentes,
        currentCount,
        maxAgentes
      }
    } catch (error) {
      throw error
    }
  }
}))
