"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
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

  // 载入本机已保存配置
  useEffect(() => {
    const saved = loadConfig()
    if (saved) {
      setConfig(saved)
      setUrlInput(saved.url)
      setKeyInput(saved.anonKey)
    }
  }, [])

  // 读取【一级分类 tier=1】
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
          .order("name", { ascending: true })
        if (cancelled) return
        if (error) {
          setCatError(error.message)
          return
        }
        setCategories((data as Category[]) ?? [])
      } catch (err) {
        if (cancelled) return
        setCatError(err instanceof Error ? err.message : "读取分类失败")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config])

  // 选中一级后，自动加载对应【二级分类 tier=2 & parent_id=一级id】
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
    return () => (cancelled = true)
  }, [config, form.category])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    // 切换一级时清空二级
    if (key === "category") update("subcategory", "" as FormState[K])
    setForm((prev) => ({ ...prev, [key]: value }))
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
      setStatus({ type: "error", message: "请填写所有必填项（带星号）" })
      return
    }

    setStatus({ type: "submitting" })

    const gallery = form.gallery_images
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      main_image: form.main_image.trim(),
      category: form.category,
      subcategory: form.subcategory,
      gallery_images: gallery,
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      is_active: form.is_active,
      price: form.price.trim() === "" ? null : Number(form.price),
      sort_order: form.sort_order.trim() === "" ? null : Number(form.sort_order),
    }

    try {
      const supabase = makeClient(config)
      const { error } = await supabase.from("products").insert(payload)
      if (error) {
        setStatus({ type: "error", message: error.message })
        return
      }
      setStatus({ type: "success", name: form.name.trim() })
      setForm(EMPTY_FORM)
      setShowOptional(false)
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "提交失败，请检查配置",
      })
    }
  }

  // 未配置链接
  if (!config) {
    return (
      <form
        onSubmit={handleSaveConfig}
        className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-card-foreground">连接 Supabase</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          填入项目的 URL 与 anon key，仅保存在本机浏览器。
        </p>
        <div className="mt-5 flex flex-col gap-4">
          <Field label="Supabase URL" required>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              className={inputClass}
              required
            />
          </Field>
          <Field label="anon key" required>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="eyJhbGci..."
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
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">录入产品</h2>
        <button
          type="button"
          onClick={handleResetConfig}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          重设连接
        </button>
      </div>

      {catError && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          分类读取失败：{catError}
        </p>
      )}

      {/* 必填区 */}
      <div className="mt-5 flex flex-col gap-4">
        <Field label="产品名 name" required>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="例如：8 英寸陶瓷餐盘"
          />
        </Field>

        <Field label="URL 别名 slug" required>
          <input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            className={inputClass}
            placeholder="例如：8-inch-ceramic-dinner-plate"
          />
        </Field>

        <Field label="主图链接 main_image" required>
          <input
            type="url"
            value={form.main_image}
            onChange={(e) => update("main_image", e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="一级分类 category" required>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className={inputClass}
              disabled={categories.length === 0}
            >
              <option value="">
                {categories.length === 0 ? "分类加载中…" : "请选择"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="二级分类 subcategory" required>
            <select
              value={form.subcategory}
              onChange={(e) => update("subcategory", e.target.value)}
              disabled={!form.category || subCategories.length === 0}
              className={inputClass + " disabled:opacity-50"}
            >
              <option value="">
                {form.category ? "请选择" : "请先选一级分类"}
              </option>
              {subCategories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* 选填折叠区 */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="mt-6 flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground"
      >
        <span>选填信息</span>
        <span className="text-muted-foreground">{showOptional ? "收起 −" : "展开 +"}</span>
      </button>

      {showOptional && (
        <div className="mt-4 flex flex-col gap-4">
          <Field label="多图 gallery_images（每行或逗号分隔一个链接）">
            <textarea
              value={form.gallery_images}
              onChange={(e) => update("gallery_images", e.target.value)}
              rows={3}
              className={inputClass}
              placeholder={"https://...\nhttps://..."}
            />
          </Field>

          <Field label="描述 description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field label="规格 specifications">
            <textarea
              value={form.specifications}
              onChange={(e) => update("specifications", e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="例如：直径 20cm，重量 350g，微波炉适用"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="批发价 price">
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </Field>

            <Field label="排序号 sort_order">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => update("sort_order", e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-card-foreground">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            上架 is_active
          </label>
        </div>
      )}

      {status.type === "error" && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {status.message}
        </p>
      )}

      {status.type === "success" && (
        <p className="mt-4 rounded-lg bg-primary/10 px-4 py-2.5 text-sm text-primary">
          已成功录入「{status.name}」
        </p>
      )}

      <button
        type="submit"
        disabled={status.type === "submitting"}
        className={primaryBtnClass + " mt-6 disabled:opacity-60"}
      >
        {status.type === "submitting" ? "提交中…" : "提交录入"}
      </button>
    </form>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-card-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"

const primaryBtnClass =
  "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
