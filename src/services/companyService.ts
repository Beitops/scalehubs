import { supabase } from '../lib/supabase'

export interface Company {
  id: number
  cif: string
  nombre: string
  email_contacto?: string | null
  volumen_diario: number
  prioridad: number
  activa: boolean
  url_recepcion_leads?: string | null
}

export const companyService = {
  /**
   * Obtiene el nombre de la empresa por CIF
   * @param cif - CIF de la empresa
   * @returns Promise con el nombre de la empresa
   */
  getCompanyNameByCIF: async (cif: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('nombre')
        .eq('cif', cif)
        .single()

      if (error) {
        console.error('Error getting company name:', error)
        return cif // Si no se puede obtener el nombre, devolver el CIF
      }

      return data?.nombre || cif
    } catch (error) {
      console.error('Error getting company name:', error)
      return cif
    }
  },

  /**
   * Obtiene todas las empresas
   * @returns Promise con la lista de empresas
   */
  getCompanies: async (): Promise<Company[]> => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nombre')
      if (error) {
        console.error('Error getting companies:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting companies:', error)
      return []
    }
  },

  /**
   * Crea una nueva empresa
   * @param company - Datos de la empresa
   * @returns Promise con la empresa creada
   */
  createCompany: async (company: Omit<Company, 'id'>): Promise<Company> => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert({
          cif: company.cif,
          nombre: company.nombre,
          email_contacto: company.email_contacto,
          volumen_diario: company.volumen_diario,
          prioridad: company.prioridad,
          activa: company.activa,
          url_recepcion_leads: company.url_recepcion_leads
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating company:', error)
        throw new Error('Error al crear la empresa')
      }

      return data
    } catch (error) {
      console.error('Error creating company:', error)
      throw new Error('Error al crear la empresa')
    }
  },

  /**
   * Obtiene una empresa por CIF
   * @param cif - CIF de la empresa
   * @returns Promise con la empresa
   */
  getCompanyByCIF: async (cif: string): Promise<Company | null> => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('cif', cif)
        .single()

      if (error) {
        console.error('Error getting company by CIF:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting company by CIF:', error)
      return null
    }
  },

  /**
   * Actualiza una empresa
   * @param id - ID de la empresa
   * @param updates - Datos a actualizar
   * @returns Promise con la empresa actualizada
   */
  updateCompany: async (id: number, updates: Partial<Omit<Company, 'id'>>): Promise<Company | null> => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .update({
          cif: updates.cif,
          nombre: updates.nombre,
          email_contacto: updates.email_contacto,
          volumen_diario: updates.volumen_diario,
          prioridad: updates.prioridad,
          activa: updates.activa,
          url_recepcion_leads: updates.url_recepcion_leads
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating company:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating company:', error)
      return null
    }
  },

  /**
   * Elimina una empresa
   * @param id - ID de la empresa
   * @returns Promise con el resultado
   */
  deleteCompany: async (id: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting company:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting company:', error)
      return false
    }
  },

  /**
   * Verifica si una empresa está baneada usando la función RPC
   * @param empresaId - ID de la empresa
   * @returns Promise con true si está baneada, false si no
   */
  empresaEstaBaneada: async (empresaId: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('empresa_esta_baneada', { p_empresa_id: empresaId })

      if (error) {
        console.error('Error checking if company is banned:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('Error checking if company is banned:', error)
      return false
    }
  },

  /**
   * Obtiene la información del baneo activo de una empresa
   * @param empresaId - ID de la empresa
   * @returns Promise con la información del baneo o null si no está baneada
   */
  obtenerBaneo: async (empresaId: number): Promise<{ id: number; motivo: string; fecha_baneo: string; fecha_expiracion: string | null } | null> => {
    try {
      const { data, error } = await supabase
        .from('empresas_baneadas')
        .select('id, motivo, fecha_baneo, fecha_expiracion')
        .eq('empresa_id', empresaId)
        .is('fecha_expiracion', null)
        .order('fecha_baneo', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No hay baneo activo
          return null
        }
        console.error('Error getting ban info:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting ban info:', error)
      return null
    }
  },

  /**
   * Banea una empresa
   * @param empresaId - ID de la empresa
   * @param motivo - Motivo del baneo (máximo 100 caracteres)
   * @returns Promise con el resultado
   */
  banearEmpresa: async (empresaId: number, motivo: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('empresas_baneadas')
        .insert({
          empresa_id: empresaId,
          motivo: motivo.substring(0, 100) // Asegurar máximo 100 caracteres
        })

      if (error) {
        console.error('Error banning company:', error)
        throw new Error('Error al banear la empresa')
      }

      return true
    } catch (error) {
      console.error('Error banning company:', error)
      throw error
    }
  },

  /**
   * Desbanea una empresa actualizando la fecha_expiracion del último baneo
   * @param empresaId - ID de la empresa
   * @returns Promise con el resultado
   */
  async desbanearEmpresa(empresaId: number): Promise<boolean> {
    try {
      // Obtener el último baneo activo usando la función existente
      const baneo = await this.obtenerBaneo(empresaId)

      if (!baneo) {
        throw new Error('No se encontró un baneo activo para esta empresa')
      }

      // Actualizar la fecha_expiracion
      const { error } = await supabase
        .from('empresas_baneadas')
        .update({ fecha_expiracion: new Date().toISOString() })
        .eq('id', baneo.id)

      if (error) {
        console.error('Error unbanning company:', error)
        throw new Error('Error al desbanear la empresa')
      }

      return true
    } catch (error) {
      console.error('Error unbanning company:', error)
      throw error
    }
  }
} 