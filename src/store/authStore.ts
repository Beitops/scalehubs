import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { FrontendUser } from '../types/database'
import type { Session } from '@supabase/supabase-js'





interface EmpresaConfiguracion {
    maxSolicitudesPorAgente: number
    solicitudesAutomaticas: boolean
}

interface AuthState {
    user: FrontendUser | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    userEmpresaId: number | null
    userEmpresaNombre: string
    userEmpresaConfiguracion: EmpresaConfiguracion | null
    session: Session | null
    login: (email: string, password: string) => Promise<void>
    signup: (email: string, password: string, userData: any) => Promise<void>
    logout: () => void
    clearError: () => void
    checkAuth: (session: Session | null) => Promise<void>
    getUserEmpresaInfo: () => Promise<{ userEmpresaId: number | null; userEmpresaNombre: string }>
    updateEmpresaConfiguracion: (config: EmpresaConfiguracion) => Promise<void>
    updatePassword: (newPassword: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                userEmpresaId: null,
                userEmpresaNombre: '',
                userEmpresaConfiguracion: null,
                session: null,

                getUserEmpresaInfo: async () => {
                    const { user } = get()
                    if (!user?.id) return { userEmpresaId: null, userEmpresaNombre: '' }

                    try {
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('empresa_id')
                            .eq('user_id', user.id)
                            .single()

                        if (!profileError && profile?.empresa_id) {
                            // Obtener nombre de la empresa
                            const { data: empresa, error: empresaError } = await supabase
                                .from('empresas')
                                .select('nombre')
                                .eq('id', profile.empresa_id)
                                .single()

                            if (!empresaError && empresa) {
                                return { userEmpresaId: profile.empresa_id, userEmpresaNombre: empresa.nombre }
                            } else {
                                return { userEmpresaId: profile.empresa_id, userEmpresaNombre: '' }
                            }
                        } else {
                            // Si no hay empresa_id o hay error, retornar valores por defecto
                            return { userEmpresaId: null, userEmpresaNombre: '' }
                        }
                    } catch (error) {
                        console.error('Error getting user empresa info:', error)
                        // En caso de error, retornar valores por defecto
                        return { userEmpresaId: null, userEmpresaNombre: '' }
                    }
                },

                login: async (email: string, password: string) => {

                    try {
                        // Iniciar sesión con Supabase
                        const { data, error } = await supabase.auth.signInWithPassword({
                            email,
                            password
                        })

                        if (error) {
                            throw new Error(error.message)
                        }

                        if (!data.user) {
                            throw new Error('No se pudo autenticar al usuario')
                        }


                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al iniciar sesión'
                        })
                    }
                },

                signup: async (email: string, password: string) => {
                    set({ isLoading: true, error: null })

                    try {
                        // Obtener el usuario actual de Supabase (el usuario invitado)
                        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

                        if (userError || !currentUser) {
                            throw new Error('No se pudo obtener la información del usuario')
                        }

                        // Actualizar solo la contraseña del usuario invitado
                        const { error: updateError } = await supabase.auth.updateUser({
                            password: password
                        })

                        if (updateError) {
                            throw new Error(updateError.message)
                        }

                        // Obtener los datos del usuario actualizado
                        const { data: { user: updatedUser }, error: getUserError } = await supabase.auth.getUser()

                        if (getUserError || !updatedUser) {
                            throw new Error('Error al obtener el usuario actualizado')
                        }

                        // Obtener el perfil existente (ya creado por la edge function)
                        const { data: profileWithEmpresa, error: profileError } = await supabase
                            .from('profiles')
                            .select(`
                                *,
                                empresas!inner(
                                    id,
                                    nombre,
                                    cif
                                )
                            `)
                            .eq('user_id', updatedUser.id)
                            .single()

                        if (profileError) {
                            console.error('Error al obtener perfil:', profileError)
                            throw new Error('Perfil de usuario no encontrado')
                        }

                        const { data: roles, error: rolesError } = await supabase
                            .from('roles')
                            .select('nombre')
                            .eq('id', profileWithEmpresa.rol_id)
                            .single()

                        if (rolesError || !roles) {
                            console.error('Error al obtener roles:', rolesError)
                            throw new Error('Error al obtener roles')
                        }
                        

                        // Extraer información de la empresa
                        const empresa = profileWithEmpresa.empresas
                        const companyCif = empresa?.cif || ''
                        const userEmpresaId = empresa?.id || null
                        const userEmpresaNombre = empresa?.nombre || ''

                        // Cargar configuración de la empresa si existe
                        let empresaConfiguracion = null
                        if (userEmpresaId) {
                            const { data: configData } = await supabase
                                .from('configuraciones_empresa')
                                .select('configuraciones')
                                .eq('empresa_id', userEmpresaId)
                                .single()
                            
                            if (configData?.configuraciones) {
                                empresaConfiguracion = configData.configuraciones as EmpresaConfiguracion
                            }
                        }

                        // Crear objeto de usuario para el store
                        const frontendUser: FrontendUser = {
                            id: updatedUser.id,
                            nombre: profileWithEmpresa.nombre || 'Usuario',
                            email: email,
                            empresa: companyCif,
                            rol: roles.nombre
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                            userEmpresaId: userEmpresaId,
                            userEmpresaNombre: userEmpresaNombre,
                            userEmpresaConfiguracion: empresaConfiguracion
                        })
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al crear la cuenta'
                        })
                    }
                },

                logout: async () => {
                    try {
                        // Cerrar sesión en Supabase
                        const { error } = await supabase.auth.signOut()

                        if (error) {
                            console.error('Error al cerrar sesión:', error)
                        }
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error)
                    } finally {
                        // Limpiar estado local independientemente del resultado
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                            userEmpresaId: null,
                            userEmpresaNombre: '',
                            userEmpresaConfiguracion: null,
                            session: null
                        })
                        window.location.reload()
                    }
                },

                clearError: () => {
                    set({ error: null })
                },

                updateEmpresaConfiguracion: async (config: EmpresaConfiguracion) => {
                    const { userEmpresaId } = get()
                    if (!userEmpresaId) {
                        throw new Error('No se encontró la empresa del usuario')
                    }

                    try {
                        const { error } = await supabase
                            .from('configuraciones_empresa')
                            .upsert({
                                empresa_id: userEmpresaId,
                                configuraciones: config,
                                fecha_modificacion: new Date().toISOString()
                            })

                        if (error) {
                            throw new Error(error.message)
                        }

                        set({ userEmpresaConfiguracion: config })
                    } catch (error) {
                        throw error
                    }
                },

                updatePassword: async (newPassword: string) => {
                    try {
                        const { error } = await supabase.auth.updateUser({
                            password: newPassword
                        })

                        if (error) {
                            throw new Error(error.message)
                        }
                    } catch (error) {
                        throw error
                    }
                },

                // Función para verificar el estado de autenticación al cargar la app
                checkAuth: async (session: Session | null) => {


                    try {
                        if (session?.user && session.user.id) {
                            set({ isLoading: true, error: null })
                            // Obtener el perfil del usuario y la información de la empresa en una sola consulta
                            const { data: profileWithEmpresa, error: profileError } = await supabase
                                .from('profiles')
                                .select(`
                                    *,
                                    empresas(
                                        id,
                                        nombre,
                                        cif
                                    )
                                `)
                                .eq('user_id', session.user.id)
                                .single()
                            



                            if (profileError) {
                                console.error('Error al obtener perfil:', profileError)
                                // Si no hay perfil, limpiar el estado
                                set({
                                    user: null,
                                    isAuthenticated: false,
                                    isLoading: false
                                })
                                return
                            }

                            const { data: roles, error: rolesError } = await supabase
                                .from('roles')
                                .select('nombre')
                                .eq('id', profileWithEmpresa.rol_id)
                                .single()

                            if (rolesError || !roles) {
                                console.error('Error al obtener roles:', rolesError)
                                throw new Error('Error al obtener roles')
                            }

                            // Extraer información de la empresa (puede ser null para admins)
                            const empresa = profileWithEmpresa.empresas
                            const companyCif = empresa?.cif || ''
                            const empresaId = empresa?.id || null
                            const empresaNombre = empresa?.nombre || ''

                            // Cargar configuración de la empresa si existe
                            let empresaConfiguracion = null
                            if (empresaId) {
                                const { data: configData } = await supabase
                                    .from('configuraciones_empresa')
                                    .select('configuraciones')
                                    .eq('empresa_id', empresaId)
                                    .single()
                                
                                if (configData?.configuraciones) {
                                    empresaConfiguracion = configData.configuraciones as EmpresaConfiguracion
                                }
                            }

                            const frontendUser: FrontendUser = {
                                id: profileWithEmpresa.user_id,
                                nombre: profileWithEmpresa.nombre || 'Usuario',
                                email: session.user.email || '',
                                empresa: companyCif,
                                rol: roles.nombre
                            }

                            set({
                                user: frontendUser,
                                isAuthenticated: true,
                                isLoading: false,
                                userEmpresaId: empresaId,
                                userEmpresaNombre: empresaNombre,
                                userEmpresaConfiguracion: empresaConfiguracion,
                                session: session
                            })
                        }
                    } catch (error) {
                        console.error('Error checking auth:', error)
                        set({ isLoading: false, error: error instanceof Error ? error.message : 'Error al verificar la autenticación' })
                    }
                }
            }),
            {
                name: 'auth-storage', // name of the item in localStorage
                partialize: (state) => ({
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    userEmpresaId: state.userEmpresaId,
                    userEmpresaNombre: state.userEmpresaNombre,
                    userEmpresaConfiguracion: state.userEmpresaConfiguracion,
                    session: state.session
                }), // persist these fields
            }
        ),
        {
            name: 'AuthStore',
        }
    )
)

// Listener para cambios de autenticación de Supabase
