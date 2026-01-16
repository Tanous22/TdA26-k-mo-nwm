import { ref } from 'vue'
const API_URL = import.meta.env.VITE_API_URL || '/api'
export interface ApiResponse<T = any> {
  data: T | null
  error: string | null
  loading: boolean
}
export function useApi() {
  const makeRequest = async <T = any>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    const loading = ref(true)
    const error = ref<string | null>(null)
    let data: T | null = null
    try {
      const response = await fetch(`${API_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}`)
      }
      data = await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
    return { data, error: error.value, loading: loading.value }
  }
  const get = <T = any>(url: string) =>
    makeRequest<T>(url, { method: 'GET' })
  const post = <T = any>(url: string, body: any) =>
    makeRequest<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  const put = <T = any>(url: string, body: any) =>
    makeRequest<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  const del = <T = any>(url: string) =>
    makeRequest<T>(url, { method: 'DELETE' })
  const postFormData = <T = any>(url: string, formData: FormData) =>
    makeRequest<T>(url, {
      method: 'POST',
      body: formData,
      headers: {}, // Necháme FormData aby sám nastavil Content-Type
    })
  return {
    get,
    post,
    put,
    del,
    postFormData,
    API_URL,
  }
}
