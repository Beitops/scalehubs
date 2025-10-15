import { useState, useEffect } from 'react'
import { companyService } from '../services/companyService'
import type { Company } from '../services/companyService'
import { ActionMenu } from '../components/ActionMenu'
import { useAuthStore } from '../store/authStore'

const Empresas = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [messageVisible, setMessageVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSuccess, setConfigSuccess] = useState<string | null>(null)
  
  // Estados para el modal de detalles
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsCompany, setDetailsCompany] = useState<Company | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)
  
  // Filtros
  const [nameFilter, setNameFilter] = useState('')
  const [cifFilter, setCifFilter] = useState('')
  
  // Formulario para nueva empresa
  const [newCompany, setNewCompany] = useState({
    nombre: '',
    email: '',
    volumen_diario: 0,
    prioridad: 1,
    cif: ''
  })

  // Estados para configuraciones
  const [empresaConfiguracion, setEmpresaConfiguracion] = useState({
    maxSolicitudesPorAgente: 1,
    solicitudesAutomaticas: false,
    maximoAgentes: 1,
    diasExclusividad: 0,
    rehusarLeadsAgentes: false
  })

  const { getEmpresaConfiguracion, updateEmpresaConfiguracionById } = useAuthStore()

  // Cargar empresas
  useEffect(() => {
    loadCompanies()
  }, [])

  // Filtrar empresas cuando cambien los filtros
  useEffect(() => {
    filterCompanies()
  }, [companies, nameFilter, cifFilter])

  const loadCompanies = async () => {
    try {
      setLoading(true)
    
      const data = await companyService.getCompanies()

      setCompanies(data)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCompanies = () => {
    let filtered = companies

    if (nameFilter) {
      filtered = filtered.filter(company => 
        company.nombre.toLowerCase().includes(nameFilter.toLowerCase())
      )
    }

    if (cifFilter) {
      filtered = filtered.filter(company => 
        company.cif.toLowerCase().includes(cifFilter.toLowerCase())
      )
    }

    setFilteredCompanies(filtered)
    setCurrentPage(1) // Resetear a la primera página cuando se filtra
  }

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    setShowSuccessMessage(false)

    try {
      await companyService.createCompany({
        nombre: newCompany.nombre,
        email_contacto: newCompany.email || null,
        volumen_diario: newCompany.volumen_diario,
        prioridad: newCompany.prioridad,
        cif: newCompany.cif,
        activa: false, // Por defecto false
        url_recepcion_leads: null // Por defecto null
      })

      // Mostrar mensaje de éxito
      setMessage('Empresa creada con éxito.')
      setShowSuccessMessage(true)
      setTimeout(() => setMessageVisible(true), 100)

      // Cerrar modal
      setShowAddModal(false)

      // Limpiar formulario
      setNewCompany({
        nombre: '',
        email: '',
        volumen_diario: 0,
        prioridad: 1,
        cif: ''
      })

      // Recargar empresas
      await loadCompanies()

    } catch (error) {
      console.error('Error creating company:', error)
      setMessage('Error al crear la empresa.')
      setShowSuccessMessage(true)
      setTimeout(() => setMessageVisible(true), 100)
    } finally {
      setIsLoading(false)
      
      // Ocultar mensaje después de 4 segundos
      setTimeout(() => {
        setMessageVisible(false)
        setTimeout(() => {
          setShowSuccessMessage(false)
        }, 300)
      }, 4000)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewCompany({
      ...newCompany,
      [e.target.name]: e.target.type === 'number' ? Number(e.target.value) : e.target.value
    })
  }

  const handleMostrarDetalles = (company: Company) => {
    setDetailsCompany(company)
    setShowDetailsModal(true)
  }

  const handleToggleActiva = async () => {
    if (!detailsCompany) return

    setToggleLoading(true)
    try {
      const updatedCompany = await companyService.updateCompany(detailsCompany.id, {
        activa: !detailsCompany.activa
      })

      if (updatedCompany) {
        // Actualizar el estado local
        setDetailsCompany(updatedCompany)
        
        // Recargar la lista de empresas para reflejar el cambio
        await loadCompanies()

        // Mostrar mensaje de éxito
        setMessage(`Empresa ${updatedCompany.activa ? 'activada' : 'desactivada'} correctamente`)
        setShowSuccessMessage(true)
        setTimeout(() => setMessageVisible(true), 100)

        // Ocultar mensaje después de 4 segundos
        setTimeout(() => {
          setMessageVisible(false)
          setTimeout(() => {
            setShowSuccessMessage(false)
          }, 300)
        }, 4000)
      } else {
        throw new Error('No se pudo actualizar la empresa')
      }
    } catch (error) {
      console.error('Error toggling company active status:', error)
      setMessage('Error al actualizar el estado de la empresa')
      setShowSuccessMessage(true)
      setTimeout(() => setMessageVisible(true), 100)

      setTimeout(() => {
        setMessageVisible(false)
        setTimeout(() => {
          setShowSuccessMessage(false)
        }, 300)
      }, 4000)
    } finally {
      setToggleLoading(false)
    }
  }

  const handleConfigurarEmpresa = async (company: Company) => {
    setSelectedCompany(company)
    setConfigError(null)
    setConfigSuccess(null)
    setConfigLoading(true)
    setShowConfigModal(true)

    try {
      const config = await getEmpresaConfiguracion(company.id)
      setEmpresaConfiguracion({
        maxSolicitudesPorAgente: config?.maxSolicitudesPorAgente || 1,
        solicitudesAutomaticas: config?.solicitudesAutomaticas || false,
        maximoAgentes: config?.maximoAgentes !== undefined ? config.maximoAgentes : 1,
        diasExclusividad: config?.diasExclusividad ?? 0,
        rehusarLeadsAgentes: config?.rehusarLeadsAgentes || false
      })
    } catch (error) {
      console.error('Error loading company config:', error)
      setConfigError('Error al cargar las configuraciones de la empresa')
    } finally {
      setConfigLoading(false)
    }
  }

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    setConfigLoading(true)
    setConfigError(null)
    setConfigSuccess(null)

    try {
      // Asegurar que los valores numéricos tengan valores por defecto si están vacíos
      const configToSave = {
        ...empresaConfiguracion,
        maximoAgentes: empresaConfiguracion.maximoAgentes !== undefined ? empresaConfiguracion.maximoAgentes : 1,
        diasExclusividad: empresaConfiguracion.diasExclusividad !== undefined ? empresaConfiguracion.diasExclusividad : 0,
        rehusarLeadsAgentes: empresaConfiguracion.rehusarLeadsAgentes || false
      }
      
      await updateEmpresaConfiguracionById(selectedCompany.id, configToSave)
      setConfigSuccess('Configuraciones actualizadas correctamente')
    } catch (error) {
      console.error('Error updating company config:', error)
      setConfigError('Error al actualizar las configuraciones')
    } finally {
      setConfigLoading(false)
    }
  }

  const handleConfigInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'number') {
      // Permitir campo vacío temporalmente para mejor UX
      if (value === '') {
        setEmpresaConfiguracion(prev => ({
          ...prev,
          [name]: 0
        }))
      } else {
        setEmpresaConfiguracion(prev => ({
          ...prev,
          [name]: Number(value)
        }))
      }
    } else if (type === 'checkbox') {
      setEmpresaConfiguracion(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else {
      setEmpresaConfiguracion(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const getActionMenuItems = (company: Company) => [
    {
      label: 'Mostrar detalles',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: () => handleMostrarDetalles(company),
      className: 'text-green-600 hover:bg-green-50'
    },
    {
      label: 'Configuraciones',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: () => handleConfigurarEmpresa(company),
      className: 'text-blue-600 hover:bg-blue-50'
    }
  ]

  // Paginación
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const getPriorityColor = (prioridad: number) => {
    switch (prioridad) {
      case 1: return 'bg-red-100 text-red-800'
      case 2: return 'bg-orange-100 text-orange-800'
      case 3: return 'bg-yellow-100 text-yellow-800'
      case 4: return 'bg-blue-100 text-blue-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const getPriorityText = (prioridad: number) => {
    switch (prioridad) {
      case 1: return 'Muy Alta'
      case 2: return 'Alta'
      case 3: return 'Media'
      case 4: return 'Baja'
      default: return 'Muy Baja'
    }
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#373643]">Empresas</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Gestiona todas las empresas registradas en el sistema
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Añadir Empresa
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="nameFilter" className="block text-sm font-medium text-[#373643] mb-2">
              Filtrar por nombre
            </label>
            <input
              type="text"
              id="nameFilter"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label htmlFor="cifFilter" className="block text-sm font-medium text-[#373643] mb-2">
              Filtrar por CIF
            </label>
            <input
              type="text"
              id="cifFilter"
              value={cifFilter}
              onChange={(e) => setCifFilter(e.target.value)}
              placeholder="Buscar por CIF..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabla de empresas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96] mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando empresas...</p>
          </div>
        ) : (
          <>
            {/* Vista de escritorio - Tabla */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CIF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volumen Diario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prioridad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#373643]">
                          {company.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {company.email_contacto || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {company.cif}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {company.volumen_diario.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(company.prioridad)}`}>
                          {getPriorityText(company.prioridad)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <ActionMenu
                          items={getActionMenuItems(company)}
                          triggerLabel="Acciones"
                          size="md"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil - Tarjetas */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {currentCompanies.map((company) => (
                  <div key={company.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm font-semibold text-[#373643] leading-tight">
                          {company.nombre}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(company.prioridad)}`}>
                          {getPriorityText(company.prioridad)}
                        </span>
                      </div>
                      
                      {/* Email arriba */}
                      <div className="text-xs">
                        <span className="text-gray-500 block">Email:</span>
                        <span className="text-gray-900 font-medium">
                          {company.email_contacto || '-'}
                        </span>
                      </div>
                      
                      {/* CIF, Volumen y Prioridad abajo en grid */}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500 block">CIF:</span>
                          <span className="text-gray-900 font-mono font-medium">
                            {company.cif}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Volumen:</span>
                          <span className="text-gray-900 font-medium">
                            {company.volumen_diario.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Prioridad:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(company.prioridad)}`}>
                            {getPriorityText(company.prioridad)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Acciones */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <ActionMenu
                          items={getActionMenuItems(company)}
                          triggerLabel="Acciones"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{' '}
                      <span className="font-medium">{startIndex + 1}</span>
                      {' '}a{' '}
                      <span className="font-medium">
                        {Math.min(endIndex, filteredCompanies.length)}
                      </span>
                      {' '}de{' '}
                      <span className="font-medium">{filteredCompanies.length}</span>
                      {' '}resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-[#18cb96] border-[#18cb96] text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Siguiente</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Añadir Empresa */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-start sm:items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-2 sm:mx-0 p-4 sm:p-6 relative z-10 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-4 sm:mt-0">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-[#373643]">Añadir Nueva Empresa</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1"
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCompany} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#373643] mb-1 sm:mb-2">
                  Nombre de la empresa *
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={newCompany.nombre}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#373643] mb-1 sm:mb-2">
                  Email de contacto
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newCompany.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div>
                <label htmlFor="cif" className="block text-sm font-medium text-[#373643] mb-1 sm:mb-2">
                  CIF *
                </label>
                <input
                  type="text"
                  id="cif"
                  name="cif"
                  value={newCompany.cif}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  placeholder="Ej: B12345678"
                />
              </div>

              <div>
                <label htmlFor="volumen_diario" className="block text-sm font-medium text-[#373643] mb-1 sm:mb-2">
                  Volumen diario *
                </label>
                <input
                  type="number"
                  id="volumen_diario"
                  name="volumen_diario"
                  value={newCompany.volumen_diario}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Puede ser 0 para casos en negociación
                </p>
              </div>

              <div>
                <label htmlFor="prioridad" className="block text-sm font-medium text-[#373643] mb-1 sm:mb-2">
                  Prioridad *
                </label>
                <select
                  id="prioridad"
                  name="prioridad"
                  value={newCompany.prioridad}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                >
                  <option value={1}>Muy Alta (1)</option>
                  <option value={2}>Alta (2)</option>
                  <option value={3}>Media (3)</option>
                  <option value={4}>Baja (4)</option>
                  <option value={5}>Muy Baja (5)</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando...
                    </span>
                  ) : (
                    'Crear Empresa'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto bg-green-500 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg z-[9999] transition-all duration-300 ease-in-out transform ${
          messageVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">✅</span>
            <span className="text-sm sm:text-base">{message}</span>
          </div>
        </div>
      )}

      {/* Configuraciones Modal overlay */}
      {showConfigModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowConfigModal(false)}
        />
      )}

      {/* Configuraciones Modal */}
      {showConfigModal && selectedCompany && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">
                Configuraciones - {selectedCompany.nombre}
              </h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Mensajes de error y éxito */}
              {configError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  {configError}
                </div>
              )}
              {configSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl">
                  {configSuccess}
                </div>
              )}

              <form onSubmit={handleConfigSubmit} className="space-y-6">
                {/* Máximo de solicitudes por agente */}
                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Máximo de solicitudes por agente
                  </label>
                  <select
                    name="maxSolicitudesPorAgente"
                    value={empresaConfiguracion.maxSolicitudesPorAgente}
                    onChange={handleConfigInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  >
                    <option value={1}>1 solicitud</option>
                    <option value={2}>2 solicitudes</option>
                    <option value={3}>3 solicitudes</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Número máximo de solicitudes de leads que puede crear cada agente al mismo tiempo
                  </p>
                </div>

                {/* Solicitudes automáticas */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="solicitudesAutomaticas"
                      checked={empresaConfiguracion.solicitudesAutomaticas}
                      onChange={handleConfigInputChange}
                      className="h-4 w-4 text-[#18cb96] focus:ring-[#18cb96] border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-[#373643]">
                      Aceptar solicitudes automáticamente
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Si está activado, las solicitudes de leads se aprobarán automáticamente sin revisión manual
                  </p>
                </div>

                {/* Máximo de agentes */}
                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Máximo de agentes
                  </label>
                  <input
                    type="number"
                    name="maximoAgentes"
                    value={empresaConfiguracion.maximoAgentes !== undefined ? empresaConfiguracion.maximoAgentes : ''}
                    onChange={handleConfigInputChange}
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número máximo de agentes que puede tener esta empresa (0 = no puede crear agentes)
                  </p>
                </div>

                {/* Días de exclusividad */}
                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Días de exclusividad
                  </label>
                  <input
                    type="number"
                    name="diasExclusividad"
                    value={empresaConfiguracion.diasExclusividad || ''}
                    onChange={handleConfigInputChange}
                    min="0"
                    max="365"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de días de exclusividad para los leads de esta empresa (0 = sin exclusividad)
                  </p>
                </div>

                {/* Agentes podrán rehusar sus propios leads */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="rehusarLeadsAgentes"
                      checked={empresaConfiguracion.rehusarLeadsAgentes}
                      onChange={handleConfigInputChange}
                      className="h-4 w-4 text-[#18cb96] focus:ring-[#18cb96] border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-[#373643]">
                      Agentes podrán rehusarse sus propios leads
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Si está activado, los agentes pueden rehusar los leads que tienen asignados
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={configLoading}
                    className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {configLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Configuraciones'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Empresa - Overlay */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowDetailsModal(false)}
        />
      )}

      {/* Modal de Detalles de Empresa */}
      {showDetailsModal && detailsCompany && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">
                Detalles de la Empresa
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="space-y-6">
                {/* ID de la empresa */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    ID de la empresa
                  </label>
                  <p className="text-base text-gray-900 font-mono">
                    {detailsCompany.id}
                  </p>
                </div>

                {/* Nombre de la empresa */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Nombre de la empresa
                  </label>
                  <p className="text-base font-semibold text-[#373643]">
                    {detailsCompany.nombre}
                  </p>
                </div>

                {/* CIF */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    CIF
                  </label>
                  <p className="text-base text-gray-900 font-mono">
                    {detailsCompany.cif}
                  </p>
                </div>

                {/* Email de contacto */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Email de contacto
                  </label>
                  <p className="text-base text-gray-900">
                    {detailsCompany.email_contacto || '-'}
                  </p>
                </div>

                {/* Volumen diario */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Volumen diario
                  </label>
                  <p className="text-base text-gray-900">
                    {detailsCompany.volumen_diario.toLocaleString()} leads
                  </p>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Prioridad
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(detailsCompany.prioridad)}`}>
                      {getPriorityText(detailsCompany.prioridad)}
                    </span>
                    <span className="text-sm text-gray-500">({detailsCompany.prioridad})</span>
                  </div>
                </div>

                {/* URL de recepción de leads */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    URL de recepción de leads
                  </label>
                  <p className="text-base text-gray-900 break-all">
                    {detailsCompany.url_recepcion_leads || '-'}
                  </p>
                </div>

                {/* Estado de la empresa con Toggle */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-3">
                    Estado de la empresa
                  </label>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${detailsCompany.activa ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`font-semibold ${detailsCompany.activa ? 'text-green-700' : 'text-red-700'}`}>
                        {detailsCompany.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <button
                      onClick={handleToggleActiva}
                      disabled={toggleLoading}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        detailsCompany.activa
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {toggleLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Actualizando...
                        </span>
                      ) : (
                        detailsCompany.activa ? 'Desactivar' : 'Activar'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {detailsCompany.activa
                      ? 'La empresa está activa y puede recibir leads'
                      : 'La empresa está inactiva y no recibirá nuevos leads'}
                  </p>
                </div>
              </div>

              {/* Botón cerrar */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Empresas 