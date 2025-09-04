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
  estado?: string
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  fecha_asignacion?: string
  plataforma_lead?: string
  observaciones?: string
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
  async getLeadsByCompany(empresaId: number, estado?: string): Promise<Lead[]> {
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
        .eq('empresa_id', empresaId)
        .order('fecha_entrada', { ascending: false })
      
      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query
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

  async getLeadsByCompanyAndUser(empresaId: number, userId: string, estado?: string): Promise<Lead[]> {
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
        .eq('empresa_id', empresaId)
        .eq('user_id', userId)
        .order('fecha_entrada', { ascending: false })
      
      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching leads by company and user:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| '')
      })) || []
    } catch (error) {
      console.error('Error in getLeadsByCompanyAndUser:', error)
      throw error
    }
  }

  async getAllLeads(estado?: string): Promise<Lead[]> {
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
        .order('fecha_entrada', { ascending: false })
      
      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching all leads:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| '')
      })) || []
    } catch (error) {
      console.error('Error in getAllLeads:', error)
      throw error
    }
  }

  async updateLeadStatus(leadId: number, estadoTemporal: string): Promise<void> {
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
    } catch (error) {
      console.error('Error in updateLeadStatus:', error)
      throw error
    }
  }

  async updateLeadObservations(leadId: number, observaciones: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ observaciones })
        .eq('id', leadId)
        .select()

      if (error) {
        console.error('Error updating lead observations:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateLeadObservations:', error)
      throw error
    }
  }

  async returnLead(leadId: number, userId: string): Promise<void> {
    try {
      // Actualizar el estado del lead a 'devolucion'
      const { error: updateError } = await supabase
        .from('leads')
        .update({ estado: 'devolucion' })
        .eq('id', leadId)
        .select()

      if (updateError) {
        console.error('Error updating lead estado:', updateError)
        throw updateError
      }

      // Insertar en tabla devoluciones
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
    } catch (error) {
      console.error('Error in returnLead:', error)
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

    async getLeadsInDateRange(startDate: string, endDate: string, empresaId?: number, estado?: string): Promise<Lead[]> {
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

      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
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

  // Obtener leads sin empresa asignada (para administradores)
  async getUnassignedLeads(): Promise<Lead[]> {
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
        .is('empresa_id', null)
        .eq('estado', 'activo')
        .order('fecha_entrada', { ascending: false })

      if (error) {
        console.error('Error fetching unassigned leads:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma || '')
      })) || []
    } catch (error) {
      console.error('Error in getUnassignedLeads:', error)
      throw error
    }
  }

  // Obtener leads de una empresa sin agente asignado (para coordinadores)
  async getUnassignedLeadsByCompany(empresaId: number): Promise<Lead[]> {
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
        .is('user_id', null)
        .eq('estado', 'activo')
        .order('fecha_entrada', { ascending: false })

      if (error) {
        console.error('Error fetching unassigned leads by company:', error)
        throw error
      }

      return data?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma || '')
      })) || []
    } catch (error) {
      console.error('Error in getUnassignedLeadsByCompany:', error)
      throw error
    }
  }

  // Asignar lead a una empresa (para administradores)
  async assignLeadToCompany(leadId: number, empresaId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ empresa_id: empresaId })
        .eq('id', leadId)

      if (error) {
        console.error('Error assigning lead to company:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in assignLeadToCompany:', error)
      throw error
    }
  }

  // Asignar lead a un agente (para coordinadores)
  async assignLeadToAgent(leadId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          user_id: userId,
          fecha_asignacion: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) {
        console.error('Error assigning lead to agent:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in assignLeadToAgent:', error)
      throw error
    }
  }
}

export const leadsService = new LeadsService() 