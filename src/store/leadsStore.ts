import { create } from 'zustand'
import { leadsService, type Lead, type ActiveLeadsPageOptions } from '../services/leadsService'
import { useAuthStore } from './authStore'

interface LeadsState {
  leadsHistorial: Lead[]
  activeLeads: Lead[]
  activeLeadsTotalCount: number
  unassignedLeads: Lead[]
  loading: boolean
  error: string | null
  isInitialized: boolean
  reloadKey: number
  historialTotalCount: number
  historialCurrentPage: number
  historialTotalPages: number
  getLeadsByCompany: (empresaId: number) => Promise<Lead[]>
  getAllLeads: () => Promise<Lead[]>
  updateLeadStatus: (leadId: number, estadoTemporal: string, userId?: string) => Promise<void>
  updateLeadObservations: (leadId: number, observaciones: string) => Promise<void>
  cancelLeadStatus: (leadId: number) => Promise<void>
  loadLeads: (empresaId?: number, startDate?: string, endDate?: string, dateField?: string) => Promise<void>
  loadLeadsByUser: (empresaId: number, userId: string, startDate?: string, endDate?: string, dateField?: string) => Promise<void>
  loadActiveLeadsPage: (options: ActiveLeadsPageOptions) => Promise<void>
  loadHistorialLeads: (empresaId?: number, estado?: string, page?: number, limit?: number, phoneFilter?: string) => Promise<void>
  loadInitialLeads: (startDate?: string, endDate?: string) => Promise<void>
  getLeadsInDateRange: (startDate: string, endDate: string, empresaId?: number, estados?: string | string[]) => Promise<Lead[]>
  refreshLeads: (startDate?: string, endDate?: string) => Promise<void>
  triggerReload: () => void
  loadUnassignedLeads: () => Promise<void>
  loadUnassignedLeadsByCompany: (empresaId: number) => Promise<void>
  assignLeadToCompany: (leadIds: number | number[], empresaId: number) => Promise<void>
  assignLeadToAgent: (leadId: number, userId: string) => Promise<void>
  getLeadById: (leadId: number) => Promise<Lead | null>
  resetInitialized: () => void
  updateActiveLeadLocally: (leadId: number, updates: Partial<Lead>) => void
  removeActiveLeadLocally: (leadId: number) => void
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leadsHistorial: [],
  activeLeads: [],
  activeLeadsTotalCount: 0,
  unassignedLeads: [],
  loading: false,
  error: null,
  isInitialized: false,
  reloadKey: 0,
  historialTotalCount: 0,
  historialCurrentPage: 1,
  historialTotalPages: 0,

  loadInitialLeads: async (startDate?: string, endDate?: string) => {
    const { user, userEmpresaId } = useAuthStore.getState()

    if (!user) return
    // Evitar cargar si ya está inicializado
    if (get().isInitialized) return

    set({ loading: true, error: null })
    try {
      if (user?.rol === 'administrador') {
        // Administrador ve todos los leads
        await get().loadLeads(undefined, startDate, endDate)
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user?.rol === 'coordinador') {
          // Coordinador ve todos los leads de su empresa
          await get().loadLeads(userEmpresaId, startDate, endDate)
        } else if (user?.rol === 'agente') {
          // Agente solo ve los leads asignados a él
          await get().loadLeadsByUser(userEmpresaId, user.id, startDate, endDate)
        } else {
          // Rol no reconocido, mostrar error
          console.error('❌ Unknown user role:', user.rol)
          throw new Error('Rol de usuario no reconocido. Contacta al administrador.')
        }
      } else {
        // Si el usuario no es admin y no tiene empresa_id, mostrar error
        console.error('❌ User without company assigned:', user)
        throw new Error('Usuario sin empresa asignada. Contacta al administrador.')
      }
      set({ isInitialized: true, loading: false })
    } catch (error) {
      console.error('Error loading initial leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads',
        loading: false 
      })
    }
  },

  refreshLeads: async (startDate?: string, endDate?: string) => {
    const { user, userEmpresaId } = useAuthStore.getState()
    
    if (!user) return

    set({ loading: true, error: null })
    try {
      if (user.rol === 'administrador') {
        await get().loadLeads(undefined, startDate, endDate)
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user.rol === 'coordinador') {
          // Coordinador ve todos los leads de su empresa
          await get().loadLeads(userEmpresaId, startDate, endDate)
        } else if (user.rol === 'agente') {
          // Agente solo ve los leads asignados a él
          await get().loadLeadsByUser(userEmpresaId, user.id, startDate, endDate)
        } else {
          // Rol no reconocido, mostrar error
          console.error('❌ Unknown user role:', user.rol)
          throw new Error('Rol de usuario no reconocido. Contacta al administrador.')
        }
      } else {
        // Si el usuario no es admin y no tiene empresa_id, mostrar error
        console.error('❌ User without company assigned:', user)
        throw new Error('Usuario sin empresa asignada. Contacta al administrador.')
      }
    } catch (error) {
      console.error('Error refreshing leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al actualizar los leads',
        loading: false 
      })
    }
  },

  loadLeads: async (empresaId?: number, startDate?: string, endDate?: string, dateField?: string) => {
    set({ loading: true, error: null })
    try {
      const { user } = useAuthStore.getState()
      const field = (dateField as any) || (user?.rol === 'coordinador' ? 'fecha_asignacion' : user?.rol === 'agente' ? 'fecha_asignacion_usuario' : 'fecha_entrada')
      
      const leads = empresaId 
        ? await leadsService.getLeadsByCompany(empresaId, 'activo', undefined, undefined, startDate, endDate, field)
        : await leadsService.getAllLeads('activo', startDate, endDate, field)
      
      set({ activeLeads: leads, loading: false })
    } catch (error) {
      console.error('Error loading leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads',
        loading: false 
      })
    }
  },

  loadLeadsByUser: async (empresaId: number, userId: string, startDate?: string, endDate?: string, dateField?: string) => {
    set({ loading: true, error: null })
    try {
      const field = (dateField as any) || 'fecha_asignacion_usuario'
      const leads = await leadsService.getLeadsByCompanyAndUser(empresaId, userId, 'activo', startDate, endDate, field)
      
      set({ activeLeads: leads, loading: false })
    } catch (error) {
      console.error('Error loading leads by user:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads del usuario',
        loading: false 
      })
    }
  },

  loadActiveLeadsPage: async (options: ActiveLeadsPageOptions) => {
    const { user, userEmpresaId } = useAuthStore.getState()
    if (!user) return

    set({ loading: true, error: null })
    try {
      const role = user.rol as 'administrador' | 'coordinador' | 'agente'
      const empresaId = user.rol === 'administrador' ? undefined : userEmpresaId ?? undefined
      const userId = user.rol === 'agente' ? user.id : undefined

      const { leads, totalCount } = await leadsService.getActiveLeadsPage(
        role,
        empresaId ?? undefined,
        userId,
        options
      )

      set({ activeLeads: leads, activeLeadsTotalCount: totalCount, loading: false })
    } catch (error) {
      console.error('Error loading active leads page:', error)
      set({
        error: error instanceof Error ? error.message : 'Error al cargar los leads',
        loading: false
      })
    }
  },

  loadHistorialLeads: async (empresaId?: number, estado?: string, page: number = 1, limit: number = 10, phoneFilter?: string) => {
    set({ loading: true, error: null })
    try {
      const { user } = useAuthStore.getState()
      
      // Obtener el conteo total
      const totalCount = await leadsService.getHistorialLeadsCount(
        empresaId, 
        estado, 
        user?.id, 
        user?.rol,
        phoneFilter
      )
      
      // Obtener los leads paginados
      const historialLeads = await leadsService.getHistorialLeads(
        empresaId, 
        estado, 
        page, 
        limit, 
        user?.id, 
        user?.rol,
        phoneFilter
      )
      
      // Calcular total de páginas
      const totalPages = Math.ceil(totalCount / limit)
      
      set({ 
        leadsHistorial: historialLeads, 
        historialTotalCount: totalCount,
        historialCurrentPage: page,
        historialTotalPages: totalPages,
        loading: false 
      })
    } catch (error) {
      console.error('Error loading historial leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar el historial de leads',
        loading: false 
      })
    }
  },

  getLeadsByCompany: async (empresaId: number) => {
    try {
      const leads = await leadsService.getLeadsByCompany(empresaId)
      return leads
    } catch (error) {
      console.error('Error getting leads by company:', error)
      throw error
    }
  },

  getAllLeads: async () => {
    try {
      const leads = await leadsService.getAllLeads()
      return leads
    } catch (error) {
      console.error('Error getting all leads:', error)
      throw error
    }
  },

  updateLeadStatus: async (leadId: number, estadoTemporal: string) => {
    try {
      await leadsService.updateLeadStatus(leadId, estadoTemporal)
    } catch (error) {
      console.error('Error updating lead status:', error)
      throw error
    }
  },

  updateLeadObservations: async (leadId: number, observaciones: string) => {
    try {
      await leadsService.updateLeadObservations(leadId, observaciones)
    } catch (error) {
      console.error('Error updating lead observations:', error)
      throw error
    }
  },

  cancelLeadStatus: async (leadId: number) => {
    try {
      await leadsService.cancelLeadStatus(leadId)
    } catch (error) {
      console.error('Error canceling lead status:', error)
      throw error
    }
  },

  getLeadsInDateRange: async (startDate: string, endDate: string, empresaId?: number, estados?: string | string[]) => {
    try {
      return await leadsService.getLeadsInDateRange(startDate, endDate, empresaId, estados)
    } catch (error) {
      console.error('Error getting leads in date range:', error)
      throw error
    }
  },

  triggerReload: () => {
    set(state => ({ reloadKey: state.reloadKey + 1 }))
  },

  loadUnassignedLeads: async () => {
    set({ loading: true, error: null })
    try {
      const leads = await leadsService.getUnassignedLeads()
      set({ unassignedLeads: leads, loading: false })
    } catch (error) {
      console.error('Error loading unassigned leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads sin asignar',
        loading: false 
      })
    }
  },

  loadUnassignedLeadsByCompany: async (empresaId: number) => {
    set({ loading: true, error: null })
    try {
      const leads = await leadsService.getUnassignedLeadsByCompany(empresaId)
      set({ unassignedLeads: leads, loading: false })
    } catch (error) {
      console.error('Error loading unassigned leads by company:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads sin asignar de la empresa',
        loading: false 
      })
    }
  },

  assignLeadToCompany: async (leadIds: number | number[], empresaId: number) => {
    try {
      await leadsService.assignLeadToCompany(leadIds, empresaId)
      // Recargar leads sin asignar después de la asignación
      await get().loadUnassignedLeads()
    } catch (error) {
      console.error('Error assigning lead to company:', error)
      throw error
    }
  },

  assignLeadToAgent: async (leadId: number, userId: string) => {
    try {
      await leadsService.assignLeadToAgent(leadId, userId)
      // Recargar leads sin asignar después de la asignación
      const { userEmpresaId } = useAuthStore.getState()
      if (userEmpresaId) {
        await get().loadUnassignedLeadsByCompany(userEmpresaId)
      }
    } catch (error) {
      console.error('Error assigning lead to agent:', error)
      throw error
    }
  },

  getLeadById: async (leadId: number) => {
    try {
      const lead = await leadsService.getLeadById(leadId)
      return lead
    } catch (error) {
      console.error('Error getting lead by ID:', error)
      throw error
    }
  },

  resetInitialized: () => {
    set({ 
      leadsHistorial: [],
      activeLeads: [],
      activeLeadsTotalCount: 0,
      unassignedLeads: [],
      historialTotalCount: 0,
      historialCurrentPage: 1,
      historialTotalPages: 0,
      isInitialized: false,
      error: null
    })
  },

  updateActiveLeadLocally: (leadId: number, updates: Partial<Lead>) => {
    set(state => ({
      activeLeads: state.activeLeads.map(lead =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      )
    }))
  },

  removeActiveLeadLocally: (leadId: number) => {
    set(state => ({
      activeLeads: state.activeLeads.filter(lead => lead.id !== leadId)
    }))
  }
})) 