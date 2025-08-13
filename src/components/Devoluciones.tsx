import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import type { LeadDevolucion } from '../services/leadsService'
import { supabase } from '../lib/supabase'



interface DevolucionesProps {
  leadsInDevolucion: LeadDevolucion[]
  leadsInTramite: LeadDevolucion[]
  setLeadsInDevolucion: (leads: LeadDevolucion[]) => void
  setLeadsInTramite: (leads: LeadDevolucion[]) => void
}

const Devoluciones = ({ leadsInDevolucion, leadsInTramite, setLeadsInDevolucion, setLeadsInTramite }: DevolucionesProps) => {
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadDevolucion | null>(null)
  const [returnForm, setReturnForm] = useState({
    audio: null as File | null,
    imagen: null as File | null,
    motivo: ''
  })
  const [adminObservations, setAdminObservations] = useState('')
  const [showAttachments, setShowAttachments] = useState(false)

  const [archivosDevolucion, setArchivosDevolucion] = useState<Array<{
    id: number
    devolucion_id: number
    ruta_archivo: string
    nombre_archivo: string
    fecha_subida: string
    tipo: string
    urlTemporal: string | null
  }>>([])
  const [cargandoArchivos, setCargandoArchivos] = useState(false)
  const { user } = useAuthStore()
  const { loadDevoluciones, loadDevolucionArchivos } = useLeadsStore()

  console.log('devoluciones')

  const handleFinishDevolucion = (lead: LeadDevolucion) => {
    setSelectedLead(lead)
    setShowFinishModal(true)
  }

  const handleProcessDevolucion = async (lead: LeadDevolucion) => {
    setSelectedLead(lead)
    setShowProcessModal(true)
    setAdminObservations('')
    setShowAttachments(false)
    setCargandoArchivos(true)
    
    // Cargar archivos adjuntos si existe devolucion_id
    if (lead.devolucion_id) {
      try {
        const archivos = await loadDevolucionArchivos(lead.devolucion_id)
        
        // Crear URLs temporales para cada archivo
        const archivosConUrls = await Promise.all(
          archivos.map(async (archivo) => {
            try {
              // Extraer el nombre del archivo de la ruta completa
              // La ruta puede ser 'pruebas/nombre_archivo.ext' o solo 'nombre_archivo.ext'
              let nombreArchivo = archivo.ruta_archivo
              if (archivo.ruta_archivo.includes('/')) {
                nombreArchivo = archivo.ruta_archivo.split('/').pop() || archivo.nombre_archivo
              }
              
              // Crear URL temporal para el archivo privado
              const { data: signedUrl, error: urlError } = await supabase.storage
                .from('pruebas')
                .createSignedUrl(nombreArchivo, 3600) // URL válida por 1 hora
              
              if (urlError) {
                console.error('Error creando URL temporal:', urlError)
                return { ...archivo, urlTemporal: null }
              }
              
              return { ...archivo, urlTemporal: signedUrl.signedUrl }
            } catch (error) {
              console.error('Error procesando archivo:', error)
              return { ...archivo, urlTemporal: null }
            }
          })
        )
        
        setArchivosDevolucion(archivosConUrls)
      } catch (error) {
        console.error('Error loading archivos:', error)
        setArchivosDevolucion([])
      } finally {
        setCargandoArchivos(false)
      }
    } else {
      setArchivosDevolucion([])
      setCargandoArchivos(false)
    }
  }

  const handleConfirmFinish = async () => {
    if (selectedLead) {
      try {
        // 1. Subir archivos al bucket 'pruebas' de Supabase
        const uploadedFiles: { audio?: string; imagen?: string } = {}
        let audioFileName = ''
        if (returnForm.audio) {
          audioFileName = `devolucion_${selectedLead.id}_audio_${Date.now()}.${returnForm.audio.name.split('.').pop()}`
          const {error: audioError } = await supabase.storage
            .from('pruebas')
            .upload(audioFileName, returnForm.audio)

          if (audioError) {
            console.error('Error subiendo audio:', audioError)
            throw new Error('Error al subir el archivo de audio')
          }

          uploadedFiles.audio = audioFileName
        }
        let imagenFileName = ''
        if (returnForm.imagen) {
          imagenFileName = `devolucion_${selectedLead.id}_imagen_${Date.now()}.${returnForm.imagen.name.split('.').pop()}`
          const { error: imagenError } = await supabase.storage
            .from('pruebas')
            .upload(imagenFileName, returnForm.imagen)

          if (imagenError) {
            console.error('Error subiendo imagen:', imagenError)
            throw new Error('Error al subir el archivo de imagen')
          }

          uploadedFiles.imagen = imagenFileName
        }

        // 2. Buscar la devolución existente para este lead
        const { data: devolucionExistente, error: searchError } = await supabase
          .from('devoluciones')
          .select('id')
          .eq('lead_id', selectedLead.id)
          .eq('estado', 'pendiente')
          .single()

        if (searchError) {
          console.error('Error buscando devolución existente:', searchError)
          throw new Error('No se encontró una devolución pendiente para este lead')
        }

        // 3. Actualizar el estado de la devolución a 'tramite'
        const { error: updateError } = await supabase
          .from('devoluciones')
          .update({
            estado: 'tramite',
            motivo: returnForm.motivo || null
          })
          .eq('id', devolucionExistente.id)

        if (updateError) {
          console.error('Error actualizando devolución:', updateError)
          throw new Error('Error al actualizar el estado de la devolución')
        }

        // 4. Insertar archivos en devolucion_archivos
        const archivosToInsert = []

        if (uploadedFiles.audio) {
          archivosToInsert.push({
            devolucion_id: devolucionExistente.id,
            ruta_archivo: `pruebas/${uploadedFiles.audio}`,
            nombre_archivo: audioFileName || 'audio',
            tipo: 'audio'
          })
        }

        if (uploadedFiles.imagen) {
          archivosToInsert.push({
            devolucion_id: devolucionExistente.id,
            ruta_archivo: `pruebas/${uploadedFiles.imagen}`,
            nombre_archivo: imagenFileName || 'imagen',
            tipo: 'imagen'
          })
        }

        if (archivosToInsert.length > 0) {
          const { error: archivosError } = await supabase
            .from('devolucion_archivos')
            .insert(archivosToInsert)

          if (archivosError) {
            console.error('Error insertando archivos:', archivosError)
            throw new Error('Error al guardar archivos de devolución')
          }
        }



        // Recargar devoluciones después de la actualización exitosa
        const { leadsInDevolucion: newLeadsInDevolucion, leadsInTramite: newLeadsInTramite } = await loadDevoluciones()
        setLeadsInDevolucion(newLeadsInDevolucion)
        setLeadsInTramite(newLeadsInTramite)

        setShowFinishModal(false)
        setSelectedLead(null)
        setReturnForm({ audio: null, imagen: null, motivo: '' })
      } catch (error) {
        console.error('Error al tramitar devolución:', error)
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    }
  }

  const handleRejectDevolucion = async () => {
    if (selectedLead && adminObservations.trim()) {
      try {
        // Buscar la devolución existente para este lead
        const { data: devolucionExistente, error: searchError } = await supabase
          .from('devoluciones')
          .select('id')
          .eq('lead_id', selectedLead.id)
          .eq('estado', 'tramite')
          .single()

        if (searchError) {
          console.error('Error buscando devolución existente:', searchError)
          throw new Error('No se encontró una devolución en trámite para este lead')
        }

        // Actualizar el estado de la devolución a 'pendiente'
        const { error: updateError } = await supabase
          .from('devoluciones')
          .update({
            estado: 'pendiente',
            comentario_admin: adminObservations,
            fecha_resolucion: new Date().toISOString()
          })
          .eq('id', devolucionExistente.id)

        if (updateError) {
          console.error('Error actualizando devolución:', updateError)
          throw new Error('Error al rechazar la devolución')
        }



        // Recargar devoluciones después de la actualización exitosa
        const { leadsInDevolucion: newLeadsInDevolucion, leadsInTramite: newLeadsInTramite } = await loadDevoluciones()
        setLeadsInDevolucion(newLeadsInDevolucion)
        setLeadsInTramite(newLeadsInTramite)

        setShowProcessModal(false)
        setSelectedLead(null)
        setAdminObservations('')
      } catch (error) {
        console.error('Error al rechazar devolución:', error)
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    }
  }

  const handleRejectDefinitivamente = async () => {
    if (selectedLead && adminObservations.trim()) {
      try {
        // Buscar la devolución existente para este lead
        const { data: devolucionExistente, error: searchError } = await supabase
          .from('devoluciones')
          .select('id')
          .eq('lead_id', selectedLead.id)
          .eq('estado', 'tramite')
          .single()

        if (searchError) {
          console.error('Error buscando devolución existente:', searchError)
          throw new Error('No se encontró una devolución en trámite para este lead')
        }

        // Actualizar el estado de la devolución a 'rechazado'
        const { error: updateError } = await supabase
          .from('devoluciones')
          .update({
            estado: 'rechazado',
            comentario_admin: adminObservations,
            fecha_resolucion: new Date().toISOString()
          })
          .eq('id', devolucionExistente.id)

        if (updateError) {
          console.error('Error actualizando devolución:', updateError)
          throw new Error('Error al rechazar definitivamente la devolución')
        }

        // Actualizar el estado_temporal de lead a 'asignado'
        const { error: updateLeadError } = await supabase
          .from('leads')
          .update({
            estado_temporal: 'asignado'
          })
          .eq('id', selectedLead.id)

        if (updateLeadError) {
          console.error('Error actualizando lead:', updateLeadError)
          throw new Error('Error al actualizar el estado temporal del lead')
        }



        // Recargar devoluciones después de la actualización exitosa
        const { leadsInDevolucion: newLeadsInDevolucion, leadsInTramite: newLeadsInTramite } = await loadDevoluciones()
        setLeadsInDevolucion(newLeadsInDevolucion)
        setLeadsInTramite(newLeadsInTramite)

        setShowProcessModal(false)
        setSelectedLead(null)
        setAdminObservations('')
      } catch (error) {
        console.error('Error al rechazar definitivamente devolución:', error)
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    }
  }

  const handleAcceptDevolucion = async () => {
    if (selectedLead) {
      try {
        // Buscar la devolución existente para este lead
        const { data: devolucionExistente, error: searchError } = await supabase
          .from('devoluciones')
          .select('id')
          .eq('lead_id', selectedLead.id)
          .eq('estado', 'tramite')
          .single()

        if (searchError) {
          console.error('Error buscando devolución existente:', searchError)
          throw new Error('No se encontró una devolución en trámite para este lead')
        }

        // Actualizar el estado de la devolución a 'resuelto'
        const { error: updateError } = await supabase
          .from('devoluciones')
          .update({
            estado: 'resuelto',
            comentario_admin: adminObservations || null,
            fecha_resolucion: new Date().toISOString()
          })
          .eq('id', devolucionExistente.id)

        if (updateError) {
          console.error('Error actualizando devolución:', updateError)
          throw new Error('Error al aceptar la devolución')
        }



        // Recargar devoluciones después de la actualización exitosa
        const { leadsInDevolucion: newLeadsInDevolucion, leadsInTramite: newLeadsInTramite } = await loadDevoluciones()
        setLeadsInDevolucion(newLeadsInDevolucion)
        setLeadsInTramite(newLeadsInTramite)

        setShowProcessModal(false)
        setSelectedLead(null)
        setAdminObservations('')
      } catch (error) {
        console.error('Error al aceptar devolución:', error)
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'imagen') => {
    const file = e.target.files?.[0]
    if (file) {
      setReturnForm(prev => ({
        ...prev,
        [type]: file
      }))
    }
  }



  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Devoluciones</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.role === 'admin'
              ? 'Gestiona las devoluciones de leads de todas las empresas'
              : `Devoluciones pendientes de ${user?.company}`
            }
          </p>
          {user?.role === 'admin' && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">
                👑 <strong>Modo Administrador:</strong> Visualizando devoluciones de todo el sistema
              </p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {user?.role !== 'admin' && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#373643]">Devoluciones Pendientes</h2>
                  <p className="text-sm text-gray-600">
                    {leadsInDevolucion?.length || 0} lead{(leadsInDevolucion?.length || 0) !== 1 ? 's' : ''} en proceso de devolución
                  </p>
                </div>
                <div className="text-3xl font-bold text-red-500">
                  {leadsInDevolucion?.length || 0}
                </div>
              </div>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#373643]">En Trámite</h2>
                  <p className="text-sm text-gray-600">
                    {leadsInTramite?.length || 0} lead{(leadsInTramite?.length || 0) !== 1 ? 's' : ''} esperando revisión
                  </p>
                </div>
                <div className="text-3xl font-bold text-orange-500">
                  {leadsInTramite?.length || 0}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Devoluciones Pendientes Section (Solo para clientes) */}
        {user?.role === 'client' && leadsInDevolucion && leadsInDevolucion.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#373643]">Devoluciones Pendientes</h2>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden">
              {leadsInDevolucion?.map((lead) => (
                <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-red-400">
                      En Devolución
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Plataforma:</span> {lead.plataforma}</p>
                    {user?.role === 'admin' && (
                      <p><span className="font-medium">Empresa:</span> {lead.empresa_nombre}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleFinishDevolucion(lead)}
                      className="text-green-600 hover:text-green-700 text-xs font-medium transition-colors"
                    >
                      Tramitar Devolución
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Fecha Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leadsInDevolucion?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#373643]">{lead.nombre_cliente}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {lead.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                          {lead.plataforma}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-red-400">
                          En Devolución
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleFinishDevolucion(lead)}
                          className="text-green-600 hover:text-green-700 transition-colors"
                        >
                          Tramitar Devolución
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* En Trámite Section (Admin Only) */}
        {user?.role === 'admin' && leadsInTramite && leadsInTramite.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#373643]">En Trámite de Revisión</h2>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden">
              {leadsInTramite?.map((lead) => (
                <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-orange-400">
                      En Trámite
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Plataforma:</span> {lead.plataforma}</p>
                    <p><span className="font-medium">Empresa:</span> {lead.empresa_nombre}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleProcessDevolucion(lead)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
                    >
                      Tramitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Fecha Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leadsInTramite?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#373643]">{lead.nombre_cliente}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {lead.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                          {lead.plataforma}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {lead.empresa_nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-orange-400">
                          En Trámite
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleProcessDevolucion(lead)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Tramitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(leadsInDevolucion?.length === 0 || leadsInDevolucion === null) && (leadsInTramite?.length === 0 || leadsInTramite === null) && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-[#373643] mb-2">No hay devoluciones pendientes</h3>
            <p className="text-gray-600 text-sm">
              Todos los leads han sido procesados correctamente.
            </p>
          </div>
        )}
      </div>

      {/* Finish Modal overlay */}
      {showFinishModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowFinishModal(false)}
        />
      )}

      {/* Finish Confirmation Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Tramitar Devolución</h2>
              <button
                onClick={() => setShowFinishModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-[#373643] mb-2">
                  Adjunta las pruebas para tramitar la devolución:
                </p>
                {selectedLead && (
                  <div className="text-xs text-gray-600 mb-3">
                    <p><strong>Nombre:</strong> {selectedLead.nombre_cliente}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.telefono}</p>
                    <p><strong>Plataforma:</strong> {selectedLead.plataforma}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                  </div>
                )}
              </div>

              {/* File Uploads */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Audio (opcional)
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileChange(e, 'audio')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Imagen (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Motivos (opcional)
                  </label>
                  <textarea
                    value={returnForm.motivo}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, motivo: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    placeholder="Añade motivos sobre la devolución..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmFinish}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Tramitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal overlay */}
      {showProcessModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowProcessModal(false)}
        />
      )}

      {/* Process Confirmation Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Tramitar Devolución</h2>
              <button
                onClick={() => setShowProcessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-[#373643] mb-2">
                  Revisa la información de la devolución:
                </p>
                {selectedLead && (
                  <div className="text-xs text-gray-600">
                    <p><strong>Nombre:</strong> {selectedLead.nombre_cliente}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.telefono}</p>
                    <p><strong>Plataforma:</strong> {selectedLead.plataforma}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                    <p><strong>Empresa:</strong> {selectedLead.empresa_nombre}</p>
                    {selectedLead.motivo && (
                      <p><strong>Motivo de devolución:</strong> {selectedLead.motivo}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {cargandoArchivos ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-500">Cargando archivos adjuntos...</p>
                  </div>
                </div>
              ) : archivosDevolucion.length > 0 ? (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="font-medium text-[#373643]">Ver Archivos Adjuntos ({archivosDevolucion.length})</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform ${showAttachments ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAttachments && (
                    <div className="px-4 pb-4 space-y-3">
                      {archivosDevolucion.map((archivo, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-[#373643]">
                              {archivo.nombre_archivo || `Archivo ${index + 1}`}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              archivo.tipo === 'audio' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {archivo.tipo === 'audio' ? '🎵 Audio' : '🖼️ Imagen'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{archivo.ruta_archivo}</p>
                          {archivo.urlTemporal ? (
                            <div className="mt-2">
                              {archivo.tipo === 'audio' ? (
                                <audio controls className="w-full">
                                  <source src={archivo.urlTemporal} />
                                  Tu navegador no soporta el elemento de audio.
                                </audio>
                              ) : (
                                <img 
                                  src={archivo.urlTemporal}
                                  alt="Archivo adjunto"
                                  className="max-w-full h-auto rounded"
                                  onError={(e) => {
                                    console.error('Error loading image:', e)
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <p className="text-xs text-red-600">
                                ❌ Error al cargar el archivo. Intenta recargar la página.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 text-center">
                    📎 No hay archivos adjuntos (audio o imagen) para esta devolución
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#373643] mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={adminObservations}
                  onChange={(e) => setAdminObservations(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  placeholder="Añade observaciones sobre tu decisión..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectDevolucion}
                  disabled={!adminObservations.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleRejectDefinitivamente}
                  disabled={!adminObservations.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rechazar Definitivamente
                </button>
                <button
                  onClick={handleAcceptDevolucion}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Devoluciones 