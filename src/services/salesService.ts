import { supabase } from '../lib/supabase'

export interface VentaRealizada {
  lead_id: number
  empresa_id: number
  user_id: string
  fecha_venta: string
  anulada: boolean
  fecha_anulacion: string | null
  motivo_anulacion: string | null
}

export interface DevolucionResuelta {
  id: number
  lead_id: number
  usuario_id: string
  fecha_solicitud: string
  estado: string
  fecha_resolucion: string | null
  comentario_admin: string | null
  motivo: string | null
}

class SalesService {
  // Obtener ventas realizadas por empresa y usuario
  async getVentasByCompany(empresaId: number, startDate?: string, endDate?: string): Promise<VentaRealizada[]> {
    try {
      let query = supabase
        .from('ventas_realizadas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('anulada', false)
        .order('fecha_venta', { ascending: false })

      if (startDate) {
        query = query.gte('fecha_venta', startDate)
      }
      if (endDate) {
        query = query.lte('fecha_venta', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching ventas by company:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getVentasByCompany:', error)
      throw error
    }
  }

  // Obtener ventas realizadas por usuario específico
  async getVentasByUser(empresaId: number, userId: string, startDate?: string, endDate?: string): Promise<VentaRealizada[]> {
    try {
      let query = supabase
        .from('ventas_realizadas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('user_id', userId)
        .eq('anulada', false)
        .order('fecha_venta', { ascending: false })

      if (startDate) {
        query = query.gte('fecha_venta', startDate)
      }
      if (endDate) {
        query = query.lte('fecha_venta', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching ventas by user:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getVentasByUser:', error)
      throw error
    }
  }

  // Obtener devoluciones resueltas por empresa
  async getDevolucionesResueltasByCompany(empresaId: number, startDate?: string, endDate?: string): Promise<DevolucionResuelta[]> {
    try {
      let query = supabase
        .from('devoluciones')
        .select(`
          *,
          lead:leads(
            id,
            empresa_id
          )
        `)
        .eq('estado', 'resuelto')
        .not('fecha_resolucion', 'is', null)

      if (startDate) {
        query = query.gte('fecha_resolucion', startDate)
      }
      if (endDate) {
        query = query.lte('fecha_resolucion', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching devoluciones resueltas:', error)
        throw error
      }

      // Filtrar por empresa_id del lead
      const filteredData = (data || []).filter(d => d.lead?.empresa_id === empresaId)

      return filteredData.map(d => ({
        id: d.id,
        lead_id: d.lead_id,
        usuario_id: d.usuario_id,
        fecha_solicitud: d.fecha_solicitud,
        estado: d.estado,
        fecha_resolucion: d.fecha_resolucion,
        comentario_admin: d.comentario_admin,
        motivo: d.motivo
      }))
    } catch (error) {
      console.error('Error in getDevolucionesResueltasByCompany:', error)
      throw error
    }
  }

  // Obtener devoluciones resueltas por usuario específico
  async getDevolucionesResueltasByUser(empresaId: number, userId: string, startDate?: string, endDate?: string): Promise<DevolucionResuelta[]> {
    try {
      let query = supabase
        .from('devoluciones')
        .select(`
          *,
          lead:leads(
            id,
            empresa_id
          )
        `)
        .eq('estado', 'resuelto')
        .eq('usuario_id', userId)
        .not('fecha_resolucion', 'is', null)

      if (startDate) {
        query = query.gte('fecha_resolucion', startDate)
      }
      if (endDate) {
        query = query.lte('fecha_resolucion', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching devoluciones resueltas by user:', error)
        throw error
      }

      // Filtrar por empresa_id del lead
      const filteredData = (data || []).filter(d => d.lead?.empresa_id === empresaId)

      return filteredData.map(d => ({
        id: d.id,
        lead_id: d.lead_id,
        usuario_id: d.usuario_id,
        fecha_solicitud: d.fecha_solicitud,
        estado: d.estado,
        fecha_resolucion: d.fecha_resolucion,
        comentario_admin: d.comentario_admin,
        motivo: d.motivo
      }))
    } catch (error) {
      console.error('Error in getDevolucionesResueltasByUser:', error)
      throw error
    }
  }

  // Obtener leads con estado_temporal 'convertido' y venta realizada
  async getLeadsConvertidosConVenta(empresaId: number, userId?: string, startDate?: string, endDate?: string): Promise<number[]> {
    try {
      // Primero obtener los lead_ids de las ventas realizadas
      let ventasQuery = supabase
        .from('ventas_realizadas')
        .select('lead_id')
        .eq('empresa_id', empresaId)
        .eq('anulada', false)

      if (userId) {
        ventasQuery = ventasQuery.eq('user_id', userId)
      }

      if (startDate) {
        ventasQuery = ventasQuery.gte('fecha_venta', startDate)
      }
      if (endDate) {
        ventasQuery = ventasQuery.lte('fecha_venta', endDate)
      }

      const { data: ventas, error: ventasError } = await ventasQuery

      if (ventasError) {
        console.error('Error fetching ventas for converted leads:', ventasError)
        throw ventasError
      }

      if (!ventas || ventas.length === 0) {
        return []
      }

      const leadIds = ventas.map(v => v.lead_id)

      // Ahora obtener los leads que tienen estado_temporal 'convertido' y están en las ventas
      let leadsQuery = supabase
        .from('leads')
        .select('id')
        .in('id', leadIds)
        .eq('estado_temporal', 'convertido')

      if (startDate) {
        leadsQuery = leadsQuery.gte('fecha_entrada', startDate)
      }
      if (endDate) {
        leadsQuery = leadsQuery.lte('fecha_entrada', endDate)
      }

      const { data: leads, error: leadsError } = await leadsQuery

      if (leadsError) {
        console.error('Error fetching converted leads:', leadsError)
        throw leadsError
      }

      return leads?.map(l => l.id) || []
    } catch (error) {
      console.error('Error in getLeadsConvertidosConVenta:', error)
      throw error
    }
  }
}

export const salesService = new SalesService()
