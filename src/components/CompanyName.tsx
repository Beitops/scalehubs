import { useCompanyName } from '../hooks/useCompanyName'

interface CompanyNameProps {
  cif: string | undefined
  fallback?: string
  className?: string
  showLoading?: boolean
}

const CompanyName = ({ cif, fallback = 'Empresa', className = '', showLoading = false }: CompanyNameProps) => {
  const { companyName, isLoading, error } = useCompanyName(cif)

  if (isLoading && showLoading) {
    return <span className={`${className} text-gray-400`}>Cargando...</span>
  }

  if (error) {
    return <span className={`${className} text-red-500`}>Error</span>
  }

  return (
    <span className={className}>
      {companyName || fallback}
    </span>
  )
}

export default CompanyName 