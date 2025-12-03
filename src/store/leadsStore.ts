import { create } from 'zustand'
import { leadsService, type Lead, type LeadDevolucion } from '../services/leadsService'
import { useAuthStore } from './authStore'
import { supabase } from '../lib/supabase'
import { platformConverter } from '../utils/platformConverter'


interface Devolucion {
  id: number
  lead_id: number
  usuario_id: string
  comentario_admin: string | null
  fecha_resolucion: string | null
  fecha_solicitud: string
  estado: string
  lead: {
    id: number
    nombre_cliente: string
    telefono: string
    plataforma: string
    fecha_entrada: string
    empresa_id: number
    empresa_nombre?: string
  }
}

interface LeadsState {
  leads: Lead[]
  leadsHistorial: Lead[]
  activeLeads: Lead[]
  unassignedLeads: Lead[]
  loading: boolean
  error: string | null
  isInitialized: boolean
  reloadKey: number
  devoluciones: Devolucion[]
  leadsInDevolucion: LeadDevolucion[]
  leadsInTramite: LeadDevolucion[]
  historialTotalCount: number
  historialCurrentPage: number
  historialTotalPages: number
  getLeadsByCompany: (empresaId: number) => Promise<Lead[]>
  getAllLeads: () => Promise<Lead[]>
  updateLeadStatus: (leadId: number, estadoTemporal: string, userId?: string) => Promise<void>
  updateLeadObservations: (leadId: number, observaciones: string) => Promise<void>
  cancelLeadStatus: (leadId: number) => Promise<void>
  loadLeads: (empresaId?: number) => Promise<void>
  loadLeadsByUser: (empresaId: number, userId: string) => Promise<void>
  loadHistorialLeads: (empresaId?: number, estado?: string, page?: number, limit?: number, phoneFilter?: string) => Promise<void>
  loadInitialLeads: () => Promise<void>
  getLeadsInDateRange: (startDate: string, endDate: string, empresaId?: number, estado?: string) => Promise<Lead[]>
  refreshLeads: () => Promise<void>
  triggerReload: () => void
  loadDevoluciones: () => Promise<void>
  loadDevolucionArchivos: (devolucionId: number) => Promise<Array<{
    id: number
    devolucion_id: number
    ruta_archivo: string
    nombre_archivo: string
    fecha_subida: string
    tipo: string
  }>>,
  cancelDevolucion: (devolucionId: number, leadId: number) => Promise<void>,
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
  leads: [],
  leadsHistorial: [],
  activeLeads: [],
  unassignedLeads: [],
  loading: false,
  error: null,
  isInitialized: false,
  reloadKey: 0,
  devoluciones: [],
  leadsInDevolucion: [],
  leadsInTramite: [],
  historialTotalCount: 0,
  historialCurrentPage: 1,
  historialTotalPages: 0,

  loadInitialLeads: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()

    if (!user) return
    // Evitar cargar si ya está inicializado
    if (get().isInitialized) return

    set({ loading: true, error: null })
    try {
      if (user?.rol === 'administrador') {
        // Administrador ve todos los leads
        await get().loadLeads()
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user?.rol === 'coordinador') {
          // Coordinador ve todos los leads de su empresa
          await get().loadLeads(userEmpresaId)
        } else if (user?.rol === 'agente') {
          // Agente solo ve los leads asignados a él
          await get().loadLeadsByUser(userEmpresaId, user.id)
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

  refreshLeads: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()
    
    if (!user) return

    set({ loading: true, error: null })
    try {
      if (user.rol === 'administrador') {
        await get().loadLeads()
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user.rol === 'coordinador') {
          // Coordinador ve todos los leads de su empresa
          await get().loadLeads(userEmpresaId)
        } else if (user.rol === 'agente') {
          // Agente solo ve los leads asignados a él
          await get().loadLeadsByUser(userEmpresaId, user.id)
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

  loadLeads: async (empresaId?: number) => {
    set({ loading: true, error: null })
    try {
      const leads = empresaId 
        ? await leadsService.getLeadsByCompany(empresaId, 'activo')
        : await leadsService.getAllLeads('activo')
      
      set({ leads, activeLeads: leads, loading: false })
    } catch (error) {
      console.error('Error loading leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads',
        loading: false 
      })
    }
  },

  loadLeadsByUser: async (empresaId: number, userId: string) => {
    set({ loading: true, error: null })
    try {
      const leads = await leadsService.getLeadsByCompanyAndUser(empresaId, userId, 'activo')
      
      set({ activeLeads: leads, loading: false })
    } catch (error) {
      console.error('Error loading leads by user:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los leads del usuario',
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

  getLeadsInDateRange: async (startDate: string, endDate: string, empresaId?: number, estado?: string) => {
    try {
      return await leadsService.getLeadsInDateRange(startDate, endDate, empresaId, estado)
    } catch (error) {
      console.error('Error getting leads in date range:', error)
      throw error
    }
  },

  triggerReload: () => {
    set(state => ({ reloadKey: state.reloadKey + 1 }))
  },

  loadDevoluciones: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()
    
    if (!user) {
      set({ devoluciones: [], leadsInDevolucion: [], leadsInTramite: [] })
    }

    try {
      let query = supabase
        .from('devoluciones')
        .select(`
          *,
          lead:leads(
            id,
            nombre_cliente,
            telefono,
            plataforma,
            fecha_entrada,
            empresa_id,
            empresas!leads_empresa_id_fkey (
              id,
              nombre
            )
          )
        `)
        .or('estado.is.null,estado.not.in.("cancelado","resuelto","rechazado")')

      const { data, error } = await query

      if (error) {
        console.error('Error loading devoluciones:', error)
        set({ devoluciones: [], leadsInDevolucion: [], leadsInTramite: [] })
      }

      // Filtrar por empresa_id si el usuario no es admin
      let filteredData = data || []
      if (user?.rol !== 'administrador' && userEmpresaId) {
        filteredData = filteredData.filter(d => d.lead?.empresa_id === userEmpresaId)
      }

      // Filtrar según el rol del usuario
      if (user?.rol === 'administrador') {
        // Para admin: mostrar solo las que tengan estado 'tramite'
        const tramiteDevoluciones = filteredData.filter(d => d.estado === 'tramite') || []
        const leadsInTramite = tramiteDevoluciones.map(d => ({
          ...d.lead,
          empresa_nombre: d.lead.empresas?.nombre,
          motivo: d.motivo || '',
          audio_devolucion: '',
          imagen_devolucion: '',
          devolucion_id: d.id,
          plataforma_lead: platformConverter(d.lead.plataforma || '')
        }))
        set({ devoluciones: filteredData, leadsInTramite })
      } else {
        // Para clientes: mostrar solo las que tengan estado 'pendiente'
        const pendienteDevoluciones = filteredData.filter(d => d.estado === 'pendiente') || []
        const leadsInDevolucion = pendienteDevoluciones.map(d => ({
          ...d.lead,
          empresa_nombre: d.lead.empresas?.nombre,
          motivo: d.motivo || '',
          audio_devolucion: '',
          imagen_devolucion: '',
          devolucion_id: d.id,
          plataforma_lead: platformConverter(d.lead.plataforma || '')
        }))

        set({ devoluciones: filteredData, leadsInDevolucion })
      }
    } catch (error) {
      console.error('Error loading devoluciones:', error)
      set({ devoluciones: [], leadsInDevolucion: [], leadsInTramite: [] })
    }
  },

  loadDevolucionArchivos: async (devolucionId: number) => {
    try {
      // Obtener el audio más reciente
      const { data: audioData, error: audioError } = await supabase
        .from('devolucion_archivos')
        .select('*')
        .eq('devolucion_id', devolucionId)
        .eq('tipo', 'audio')
        .order('fecha_subida', { ascending: false })
        .limit(1)

      // Obtener la imagen más reciente
      const { data: imagenData, error: imagenError } = await supabase
        .from('devolucion_archivos')
        .select('*')
        .eq('devolucion_id', devolucionId)
        .eq('tipo', 'imagen')
        .order('fecha_subida', { ascending: false })
        .limit(1)

      if (audioError) {
        console.error('Error loading audio archivos:', audioError)
      }
      if (imagenError) {
        console.error('Error loading imagen archivos:', imagenError)
      }

      // Combinar los resultados
      const archivos = []
      if (audioData && audioData.length > 0) {
        archivos.push(...audioData)
      }
      if (imagenData && imagenData.length > 0) {
        archivos.push(...imagenData)
      }

      return archivos
    } catch (error) {
      console.error('Error in loadDevolucionArchivos:', error)
      return []
    }
  },

  cancelDevolucion: async (devolucionId: number, leadId: number) => {
    try {
      // Actualizar el estado de la devolución a 'cancelado'
      const { error: updateDevolucionError } = await supabase
        .from('devoluciones')
        .update({
          estado: 'cancelado',
          fecha_resolucion: new Date().toISOString()
        })
        .eq('id', devolucionId)

      if (updateDevolucionError) {
        console.error('Error updating devolucion:', updateDevolucionError)
        throw updateDevolucionError
      }

      // Actualizar el estado del lead a 'activo'
      const { error: updateLeadError } = await supabase
        .from('leads')
        .update({
          estado: 'activo'
        })
        .eq('id', leadId)

      if (updateLeadError) {
        console.error('Error updating lead:', updateLeadError)
        throw updateLeadError
      }

      // Recargar devoluciones después de la actualización exitosa
      await get().loadDevoluciones()
    } catch (error) {
      console.error('Error in cancelDevolucion:', error)
      throw error
    }
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
    set({ leads: [], devoluciones: [], unassignedLeads: [], isInitialized: false })
  },

  updateActiveLeadLocally: (leadId: number, updates: Partial<Lead>) => {
    set(state => ({
      activeLeads: state.activeLeads.map(lead =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      ),
      leads: state.leads.map(lead =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      )
    }))
  },

  removeActiveLeadLocally: (leadId: number) => {
    set(state => ({
      activeLeads: state.activeLeads.filter(lead => lead.id !== leadId),
      leads: state.leads.filter(lead => lead.id !== leadId)
    }))
  }
})) 