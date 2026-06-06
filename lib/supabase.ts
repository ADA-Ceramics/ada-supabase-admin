import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const STORAGE_KEY = "ceramic_supabase_config"

export type SupabaseConfig = {
  url: string
  anonKey: string
}

// 从 localStorage 读取已保存的配置（仅本机，私密用途）。
export function loadConfig(): SupabaseConfig | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SupabaseConfig
    if (parsed?.url && parsed?.anonKey) return parsed
    return null
  } catch {
    return null
  }
}

export function saveConfig(config: SupabaseConfig) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearConfig() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

// 用运行时填入的配置创建客户端。
export function makeClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey)
}
