import { ref, computed, onMounted } from 'vue'
export interface User {
    id?: number | string
    name: string
    email: string
    role: string
}
const user = ref<User | null>(null)
const isInitialized = ref(false)
export function useAuth() {
    const login = (userData: User) => {
        user.value = userData
        localStorage.setItem('user', JSON.stringify(userData))
    }
    const logout = () => {
        user.value = null
        localStorage.removeItem('user')
    }
    const isAuthenticated = computed(() => user.value !== null)
    const isTeacher = computed(() =>
        user.value?.role === 'teacher' || user.value?.role === 'admin'
    )
    const initializeFromStorage = () => {
        if (isInitialized.value) return
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
            try {
                user.value = JSON.parse(savedUser)
            } catch (e) {
                console.error('Failed to parse stored user:', e)
                localStorage.removeItem('user')
            }
        }
        isInitialized.value = true
    }
    onMounted(() => {
        initializeFromStorage()
    })
    return {
        user,
        login,
        logout,
        isAuthenticated,
        isTeacher,
        initializeFromStorage
    }
}
