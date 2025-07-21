import { useState, useEffect } from 'react'
import { companyService } from '../services/companyService'

export const useCompanyName = (cif: string | undefined) => {
  const [companyName, setCompanyName] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getCompanyName = async () => {
      if (!cif) {
        setCompanyName('')
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const name = await companyService.getCompanyNameByCIF(cif)
        setCompanyName(name)
      } catch (err) {
        console.error('Error getting company name:', err)
        setError('Error al obtener nombre de empresa')
        setCompanyName(cif) // Fallback al CIF
      } finally {
        setIsLoading(false)
      }
    }

    getCompanyName()
  }, [cif])

  return { companyName, isLoading, error }
} 