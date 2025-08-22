/**
 * Utilidades para convertir entre formatos de rol
 * Frontend: 'admin' | 'client'
 * Backend: boolean (isAdmin)
 */

export const roleConverter = {
  /**
   * Convierte rol del frontend al formato del backend
   * @param role - Rol en formato frontend ('admin' | 'client')
   * @returns boolean - true si es admin, false si es client
   */
  frontendToBackend: (role: string): boolean => {
    return role === 'administrador'
  },

  /**
   * Convierte rol del backend al formato del frontend
   * @param isAdmin - Rol en formato backend (boolean)
   * @returns 'admin' | 'client' - Rol en formato frontend
   */
  backendToFrontend: (isAdmin: boolean): 'admin' | 'client' => {
    return isAdmin ? 'admin' : 'client'
  },

  /**
   * Convierte un array de roles del backend al formato del frontend
   * @param isAdminArray - Array de roles en formato backend
   * @returns Array de roles en formato frontend
   */
  backendArrayToFrontend: (isAdminArray: boolean[]): ('admin' | 'client')[] => {
    return isAdminArray.map(isAdmin => roleConverter.backendToFrontend(isAdmin))
  },

  /**
   * Convierte un array de roles del frontend al formato del backend
   * @param roleArray - Array de roles en formato frontend
   * @returns Array de roles en formato backend
   */
  frontendArrayToBackend: (roleArray: ('admin' | 'client')[]): boolean[] => {
    return roleArray.map(role => roleConverter.frontendToBackend(role))
  }
} 