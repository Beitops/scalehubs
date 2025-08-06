import { create } from 'zustand'
import { leadsService, type Lead } from '../services/leadsService'
import { useAuthStore } from './authStore'

interface LeadsState {
  leads: Lead[]
  loading: boolean
  error: string | null
  isInitialized: boolean
  getLeadsByCompany: (empresaId: number) => Promise<Lead[]>
  getAllLeads: () => Promise<Lead[]>
  updateLeadStatus: (leadId: number, estadoTemporal: string) => Promise<void>
  loadLeads: (empresaId?: number) => Promise<void>
  loadInitialLeads: () => Promise<void>
  getLeadsInDateRange: (startDate: string, endDate: string, empresaId?: number) => Promise<Lead[]>
  refreshLeads: () => Promise<void>
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  loading: false,
  error: null,
  isInitialized: false,

  loadInitialLeads: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()
    
    if (!user) return

    // Evitar cargar si ya está inicializado
    if (get().isInitialized) return

    set({ loading: true, error: null })
    try {
      if (user.role === 'admin') {
        await get().loadLeads()
      } else if (userEmpresaId) {
        await get().loadLeads(userEmpresaId)
      } else {
        // Si el usuario no es admin y no tiene empresa_id, mostrar error
        console.error('❌ User without company assigned:', user)
        throw new Error('Usuario sin empresa asignada. Contacta al administrador.')
      }
      set({ isInitialized: true })
    } catch (error) {
      console.error('Error loading initial leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads',
        loading: false 
      })
    }
  },

  refreshLeads: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()
    
    if (!user) return



    set({ loading: true, error: null })
    try {
      if (user.role === 'admin') {
        await get().loadLeads()
      } else if (userEmpresaId) {
        await get().loadLeads(userEmpresaId)
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

  loadLeads: async (empresaId?: number) => {
    set({ loading: true, error: null })
    try {
      const leads = empresaId 
        ? await leadsService.getLeadsByCompany(empresaId)
        : await leadsService.getAllLeads()
      
      set({ leads, loading: false })
    } catch (error) {
      console.error('Error loading leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads',
        loading: false 
      })
    }
  },

  getLeadsByCompany: async (empresaId: number) => {
    try {
      const leads = await leadsService.getLeadsByCompany(empresaId)
      set({ leads })
      return leads
    } catch (error) {
      console.error('Error getting leads by company:', error)
      throw error
    }
  },

  getAllLeads: async () => {
    try {
      const leads = await leadsService.getAllLeads()
      set({ leads })
      return leads
    } catch (error) {
      console.error('Error getting all leads:', error)
      throw error
    }
  },

  updateLeadStatus: async (leadId: number, estadoTemporal: string) => {
    try {
      await leadsService.updateLeadStatus(leadId, estadoTemporal)
      
      // Actualizar el estado local
      set(state => ({
        leads: state.leads.map(lead => 
          lead.id === leadId 
            ? { ...lead, estado_temporal: estadoTemporal }
            : lead
        )
      }))
    } catch (error) {
      console.error('Error updating lead status:', error)
      throw error
    }
  },

  getLeadsInDateRange: async (startDate: string, endDate: string, empresaId?: number) => {
    try {
      return await leadsService.getLeadsInDateRange(startDate, endDate, empresaId)
    } catch (error) {
      console.error('Error getting leads in date range:', error)
      throw error
    }
  }
})) 