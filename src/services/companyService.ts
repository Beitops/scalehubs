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
  }
} 