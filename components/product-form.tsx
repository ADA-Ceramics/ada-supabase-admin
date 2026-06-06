"use client"

import type React from "react"
import { useEffect, useState } from "react"
import {
  clearConfig,
  loadConfig,
  makeClient,
  saveConfig,
  type SupabaseConfig,
} from "@/lib/supabase"

type FormState = {
  name: string
  slug: string
  main_image: string
  category: string
  subcategory: string
  gallery_images: string
  description: string
  specifications: string
  is_active: boolean
  price: string
  sort_order: string
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  main_image: "",
  category: "",
  subcategory: "",
  gallery_images: "",
  description: "",
  specifications: "",
  is_active: true,
  price: "",
  sort_order: "",
}

type Status =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; name: string }
  | { type: "error"; message: string }

type Category = { id: string; name: string }

export function ProductForm() {
  const [config, setConfig] = useState<SupabaseConfig | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [keyInput, setKeyInput] = useState("")

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showOptional, setShowOptional] = useState(false)
  const [status, setStatus] = useState<Status>({ type: "idle" })

  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])
  const [catError, setCatError] = useState<string | null>(null)

  // 加载配置
  useEffect(() => {
    const saved = loadConfig()
    if (saved) {
      setConfig(saved)
      setUrlInput(saved.url)
      setKeyInput(saved.anonKey)
    }
  }, [])

  // 加载 一级分类（只从Supabase抓 tier=1）
  useEffect(() => {
    if (!config) return
    let cancelled = false
    setCatError(null)

    ;(async () => {
      try {
        const supabase = makeClient(config)
        const { data, error } = await supabase
          .from("product_categories")
          .select("id, name")
          .eq("tier", 1)
          .order("name")

        if (cancelled) return
        if (error) {
          setCatError(error.message)
          return
        }
        setCategories(data ?? [])
      } catch (err) {
        if (cancelled) return
        setCatError("读取分类失败")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [config])

  // 选中一级后，自动加载 二级分类（抓 tier=2 + parent_id=一级ID）
  useEffect(() => {
    if (!config || !form.category) {
      setSubCategories([])
      return
    }

    let cancelled = false
    ;(async () => {
      const supabase = makeClient(config)
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("tier", 2)
        .eq("parent_id", form.category)
        .order("name")

      if (!cancelled) setSubCategories(data ?? [])
    })()

    return () => {
      cancelled = true
    }
  }, [config, form.category])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === "category") {
      setForm((prev) => ({ ...prev, category: value, subcategory: "" }))
    } else {
      setForm((prev) => ({ ...prev, [key]: value }))
    }
  }

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    const next: SupabaseConfig = { url: urlInput.trim(), anonKey: keyInput.trim() }
    if (!next.url || !next.anonKey) return
    saveConfig(next)
    setConfig(next)
  }

  function handleResetConfig() {
    clearConfig()
    setConfig(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return

    if (
      !form.name.trim() ||
      !form.slug.trim() ||
      !form.main_image.trim() ||
      !form.category ||
      !form.subcategory
    ) {
      setStatus({ type: "error", message: "请填写所有必填项" })
      return
    }

    setStatus({ type: "submitting" })

    const gallery = form.gallery_images
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      main_image: form.main_image.trim(),
      category: form.category,
      subcategory: form.subcategory, // 👈 直接存 二级分类名称
      gallery_images: gallery,
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      is_active: form.is_active,
      price: form.price ? Number(form.price) : null,
      sort_order: form.sort_order ? Number(form.sort_order) : null,
    }

    try {
      const supabase = makeClient(config)
      const { error } = await supabase.from("products").insert(payload)
      if (error) throw error

      setStatus({ type: "success", name: form.name })
      setForm(EMPTY_FORM)
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "提交失败",
      })
    }
  }

  if (!config) {
    return (
      <form onSubmit={handleSaveConfig} className="mx-auto w-full max-w-md rounded-xl border p-6 shadow">
        <h2 className="text-lg font-semibold">连接 Supabase</h2>
        <p className="text-sm text-gray-500 mt-1">填入 URL 和 anon key</p>
        <div className="mt-5 flex flex-col gap-4">
          <Field label="Supabase URL" required>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="anon key" required>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
        </div>
        <button type="submit" className={primaryBtnClass + " mt-6"}>
          保存并继续
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl rounded-xl border p-6 shadow">
      <h2 className="text-lg font-semibold">产品录入</h2>

      {catError && <p className="mt-4 text-red-500 text-sm">{catError}</p>}

      <div className="mt-5 flex flex-col gap-4">
        <Field label="产品名" required>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
        </Field>

        <Field label="URL 别名" required>
          <input value={form.slug} onChange={(e) => update("slug", e.target.value)} className={inputClass} />
        </Field>

        <Field label="主图链接" required>
          <input type="url" value={form.main_image} onChange={(e) => update("main_image", e.target.value)} className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="一级分类" required>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className={inputClass}
            >
              <option value="">请选择</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="二级分类" required>
            <select
              value={form.subcategory}
              onChange={(e) => update("subcategory", e.target.value)}
              disabled={!form.category}
              className={inputClass}
            >
              <option value="">请选择</option>
              {subCategories.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <button type="button" onClick={() => setShowOptional(!showOptional)} className="mt-6 w-full border p-2 rounded">
        {showOptional ? "收起选填" : "展开选填"}
      </button>

      {showOptional && (
        <div className="mt-4 flex flex-col gap-4">
          <Field label="多图链接"><textarea value={form.gallery_images} onChange={(e) => update("gallery_images", e.target.value)} rows={3} className={inputClass} /></Field>
          <Field label="描述"><textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} className={inputClass} /></Field>
          <Field label="规格"><textarea value={form.specifications} onChange={(e) => update("specifications", e.target.value)} rows={3} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="价格"><input type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className={inputClass} /></Field>
            <Field label="排序"><input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className={inputClass} /></Field>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />上架</label>
        </div>
      )}

      {status.type === "error" && <p className="mt-4 text-red-500">{status.message}</p>}
      {status.type === "success" && <p className="mt-4 text-green-600">✅ 提交成功：{status.name}</p>}

      <button type="submit" disabled={status.type === "submitting"} className={primaryBtnClass + " mt-6"}>
        {status.type === "submitting" ? "提交中…" : "提交产品"}
      </button>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label} {required && <span className="text-red-500">*</span>}</span>
      {children}
    </label>
  )
}

const inputClass = "w-full rounded-lg border p-2 text-sm outline-none focus:ring-2"
const primaryBtnClass = "w-full rounded-lg bg-black text-white p-2 hover:opacity-90"
