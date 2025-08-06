import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'

const DebugInfo = () => {
  const { user, userEmpresaId, userEmpresaNombre, isAuthenticated } = useAuthStore()
  const { leads, loading, error, isInitialized } = useLeadsStore()

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <p><strong>User:</strong> {user?.name} ({user?.role})</p>
        <p><strong>Empresa ID:</strong> {userEmpresaId || 'null'}</p>
        <p><strong>Empresa Nombre:</strong> {userEmpresaNombre || 'null'}</p>
        <p><strong>Leads Count:</strong> {leads.length}</p>
        <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
        <p><strong>Initialized:</strong> {isInitialized ? 'true' : 'false'}</p>
        {error && <p><strong>Error:</strong> {error}</p>}
      </div>
    </div>
  )
}

export default DebugInfo 