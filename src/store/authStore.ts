import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: string
    name: string
    email: string
    company: string
}

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    login: (email: string, password: string) => Promise<void>
    register: (name: string, email: string, password: string, company: string) => Promise<void>
    logout: () => void
    clearError: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null })

                try {
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 1000))

                    // Mock validation - in real app this would be an API call
                    if (email === 'demo@scalehubs.com' && password === 'password') {
                        const user: User = {
                            id: '1',
                            name: 'Usuario Demo',
                            email: email,
                            company: 'ScaleHubs Demo'
                        }

                        set({
                            user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null
                        })
                    } else {
                        throw new Error('Credenciales inválidas')
                    }
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Error al iniciar sesión'
                    })
                }
            },

            register: async (name: string, email: string, password: string, company: string) => {
                set({ isLoading: true, error: null })

                try {
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 1000))

                    // Mock registration - in real app this would be an API call
                    const user: User = {
                        id: Date.now().toString(),
                        name,
                        email,
                        company
                    }

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    })
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Error al registrar usuario'
                    })
                }
            },

            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null
                })
            },

            clearError: () => {
                set({ error: null })
            }
        }),
        {
            name: 'auth-storage', // name of the item in localStorage
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }), // only persist these fields
        }
    )
) 