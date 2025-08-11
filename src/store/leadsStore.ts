import { create } from 'zustand'
import { leadsService, type Lead } from '../services/leadsService'
import { useAuthStore } from './authStore'
import { supabase } from '../lib/supabase'

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
  loading: boolean
  error: string | null
  isInitialized: boolean
  reloadKey: number
  devoluciones: Devolucion[]
  getLeadsByCompany: (empresaId: number) => Promise<Lead[]>
  getAllLeads: () => Promise<Lead[]>
  updateLeadStatus: (leadId: number, estadoTemporal: string, userId?: string) => Promise<void>
  loadLeads: (empresaId?: number) => Promise<void>
  loadInitialLeads: () => Promise<void>
  getLeadsInDateRange: (startDate: string, endDate: string, empresaId?: number) => Promise<Lead[]>
  refreshLeads: () => Promise<void>
  triggerReload: () => void
  loadDevoluciones: () => Promise<{ leadsInDevolucion: Lead[], leadsInTramite: Lead[] }>
  loadDevolucionArchivos: (devolucionId: number) => Promise<Array<{
    id: number
    devolucion_id: number
    ruta_archivo: string
    nombre_archivo: string
    fecha_subida: string
    tipo: string
  }>>,
  resetInitialized: () => void
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  loading: false,
  error: null,
  isInitialized: false,
  reloadKey: 0,
  devoluciones: [],

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

  updateLeadStatus: async (leadId: number, estadoTemporal: string, userId?: string) => {
    try {
      await leadsService.updateLeadStatus(leadId, estadoTemporal, userId)
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
  },

  triggerReload: () => {
    set(state => ({ reloadKey: state.reloadKey + 1 }))
  },

  loadDevoluciones: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()
    
    if (!user) {
      return { leadsInDevolucion: [], leadsInTramite: [] }
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
        set({ devoluciones: [] })
        return { leadsInDevolucion: [], leadsInTramite: [] }
      }

      // Filtrar por empresa_id si el usuario no es admin
      let filteredData = data || []
      if (user.role !== 'admin' && userEmpresaId) {
        filteredData = filteredData.filter(d => d.lead?.empresa_id === userEmpresaId)
      }

      set({ devoluciones: filteredData })

      // Filtrar según el rol del usuario
      if (user.role === 'admin') {
        // Para admin: mostrar solo las que tengan estado 'tramite'
        const tramiteDevoluciones = filteredData.filter(d => d.estado === 'tramite') || []
        const leadsInTramite = tramiteDevoluciones.map(d => ({
          ...d.lead,
          empresa_nombre: d.lead.empresas?.nombre,
          motivo: d.motivo || '',
          audio_devolucion: '',
          imagen_devolucion: '',
          devolucion_id: d.id
        }))
        
        return { leadsInDevolucion: [], leadsInTramite }
      } else {
        // Para clientes: mostrar solo las que tengan estado 'pendiente'
        const pendienteDevoluciones = filteredData.filter(d => d.estado === 'pendiente') || []
        const leadsInDevolucion = pendienteDevoluciones.map(d => ({
          ...d.lead,
          empresa_nombre: d.lead.empresas?.nombre,
          motivo: d.motivo || '',
          audio_devolucion: '',
          imagen_devolucion: '',
          devolucion_id: d.id
        }))
        
        return { leadsInDevolucion, leadsInTramite: [] }
      }
    } catch (error) {
      console.error('Error loading devoluciones:', error)
      set({ devoluciones: [] })
      return { leadsInDevolucion: [], leadsInTramite: [] }
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

  resetInitialized: () => {
    set({ leads: [], devoluciones: [], isInitialized: false })
  }
})) 