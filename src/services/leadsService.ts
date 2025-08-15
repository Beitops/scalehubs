import { supabase } from '../lib/supabase'
import { platformConverter } from '../utils/platformConverter'

export interface Lead {
  id: number
  fecha_entrada: string
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id: number
  empresa_nombre?: string
  estado_temporal?: string
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  fecha_asignacion?: string
  plataforma_lead?: string
}

export interface CreateLeadData {
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id: number
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  estado_temporal?: string
}
export interface LeadDevolucion extends Lead {
  audio_devolucion?: string
  imagen_devolucion?: string
  motivo?: string
  observaciones_admin?: string
  devolucion_id?: number
}

class LeadsService {
  async getLeadsByCompany(empresaId: number): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .order('fecha_entrada', { ascending: false })
      if (error) {
        console.error('Error fetching leads by company:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| '')
      })) || []
    } catch (error) {
      console.error('Error in getLeadsByCompany:', error)
      throw error
    }
  }

  async getAllLeads(): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .order('fecha_entrada', { ascending: false })

      if (error) {
        console.error('Error fetching all leads:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre
      })) || []
    } catch (error) {
      console.error('Error in getAllLeads:', error)
      throw error
    }
  }

  async updateLeadStatus(leadId: number, estadoTemporal: string, userId?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ estado_temporal: estadoTemporal })
        .eq('id', leadId)
        .select()

      if (error) {
        console.error('Error updating lead status:', error)
        throw error
      }

      // Si se está solicitando una devolución y se proporciona userId, insertar en tabla devoluciones
      if (estadoTemporal === 'devolucion' && userId) {
        // Insertar en tabla devoluciones usando el leadId que ya tenemos
        const { error: devolucionError } = await supabase
          .from('devoluciones')
          .insert({
            lead_id: leadId,
            usuario_id: userId,
            estado: 'pendiente'
          })

        if (devolucionError) {
          console.error('Error creating devolucion record:', devolucionError)
          throw devolucionError
        }
      }
    } catch (error) {
      console.error('Error in updateLeadStatus:', error)
      throw error
    }
  }

  async createLead(leadData: CreateLeadData): Promise<Lead> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .single()

      if (error) {
        console.error('Error creating lead:', error)
        throw error
      }

      return {
        ...data,
        empresa_nombre: data.empresas?.nombre
      }
    } catch (error) {
      console.error('Error in createLead:', error)
      throw error
    }
  }

  async getLeadsInDateRange(startDate: string, endDate: string, empresaId?: number): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .gte('fecha_entrada', startDate)
        .lte('fecha_entrada', endDate)
        .order('fecha_entrada', { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching leads in date range:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre
      })) || []
    } catch (error) {
      console.error('Error in getLeadsInDateRange:', error)
      throw error
    }
  }
}

export const leadsService = new LeadsService() 