"use client"
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

export function ProductForm({
  editId = null,
  initForm = null,
}: {
  editId?: string | null
  initForm?: Partial<FormState> | null
}) {
  const [config, setConfig] = useState<SupabaseConfig | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showOptional, setShowOptional] = useState(false)
  const [status, setStatus] = useState<{ type: string; name?: string; message?: string }>({ type: "idle" })
  const [topCats, setTopCats] = useState<{ id: string; name: string }[]>([])
  const [childCats, setChildCats] = useState<{ id: string; name: string }[]>([])
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    if (initForm) {
      setForm({
        ...EMPTY_FORM,
        ...initForm,
        price: initForm.price?.toString() || "",
        sort_order: initForm.sort_order?.toString() || "",
        gallery_images: Array.isArray(initForm.gallery_images)
          ? initForm.gallery_images.join(",")
          : initForm.gallery_images || "",
      })
    }
  }, [initForm])

  useEffect(() => {
    const saved = loadConfig()
    if (saved) {
      setConfig(saved)
      setUrlInput(saved.url)
      setKeyInput(saved.anonKey)
    }
  }, [])

  useEffect(() => {
    if (!config) return
    const fetch = async () => {
      try {
        const sb = makeClient(config)
        const { data, error } = await sb
          .from("product_categories")
          .select("id,name")
          .eq("tier", 1)
          .order("name")
        if (error) throw error
        setTopCats(data || [])
      } catch (e) {
        setErrMsg("分类加载失败")
      }
    }
    fetch()
  }, [config])

  useEffect(() => {
    if (!config || !form.category) {
      setChildCats([])
      return
    }
    const fetch = async () => {
      const sb = makeClient(config)
      const { data } = await sb
        .from("product_categories")
        .select("id,name")
        .eq("tier", 2)
        .eq("parent_id", form.category)
        .order("name")
      setChildCats(data || [])
    }
    fetch()
  }, [config, form.category])

  const handleFieldChange = (key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === "category") setForm((p) => ({ ...p, subcategory: "" }))
  }

  const saveSbConfig = (e: React.FormEvent) => {
    e.preventDefault()
    const cfg = { url: urlInput.trim(), anonKey: keyInput.trim() }
    saveConfig(cfg)
    setConfig(cfg)
  }

  const resetSb = () => {
    clearConfig()
    setConfig(null)
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    if (!form.name || !form.slug || !form.main_image || !form.category || !form.subcategory) {
      setStatus({ type: "error", message: "带 * 为必填项" })
      return
    }

    setStatus({ type: "submitting" })

    try {
      const gallery = form.gallery_images
        .split(/[\n,]/)
        .map(i => i.trim())
        .filter(Boolean)

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        main_image: form.main_image.trim(),
        category: form.category,
        subcategory: form.subcategory,
        gallery_images: gallery,
        description: form.description.trim() || null,
        specifications: form.specifications.trim() || null,
        is_active: form.is_active,
        price: form.price ? Number(form.price) : null,
        sort_order: form.sort_order ? Number(form.sort_order) : null,
      }

      const sb = makeClient(config)

      if (editId) {
        const { error } = await sb.from("products").update(payload).eq("id", editId)
        if (error) throw error
      } else {
        const { error } = await sb.from("products").insert(payload)
        if (error) throw error
      }

      setStatus({ type: "success", name: form.name })
    } catch (err: any) {
      console.error("提交失败", err)
      setStatus({ type: "error", message: err.message || "提交失败" })
    }
  }

  if (!config) {
    return (
      <form onSubmit={saveSbConfig} className="max-w-md mx-auto border p-6 rounded-xl">
        <h2 className="text-lg font-semibold mb-4">连接 Supabase</h2>
        <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} className="w-full border p-2 mb-2" placeholder="URL" />
        <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} className="w-full border p-2 mb-2" placeholder="Anon Key" />
        <button className="bg-black text-white py-2 w-full rounded">保存</button>
      </form>
    )
  }

  return (
    <form onSubmit={submitForm} className="max-w-2xl mx-auto border p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{editId ? "编辑产品" : "新增产品"}</h1>
        <button type="button" onClick={resetSb} className="text-sm text-gray-500 underline">重置配置</button>
      </div>

      {errMsg && <p className="text-red-500 mb-3">{errMsg}</p>}

      <input
        value={form.name}
        onChange={e=>handleFieldChange("name", e.target.value)}
        placeholder="产品名称 *"
        className="w-full border p-2 mb-3"
        required
      />

      <input
        value={form.slug}
        onChange={e=>handleFieldChange("slug", e.target.value)}
        placeholder="URL 别名 *"
        className="w-full border p-2 mb-3"
        required
      />

      <input
        value={form.main_image}
        onChange={e=>handleFieldChange("main_image", e.target.value)}
        placeholder="主图链接 *"
        className="w-full border p-2 mb-3"
        required
      />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <select
          value={form.category}
          onChange={e=>handleFieldChange("category", e.target.value)}
          className="border p-2"
        >
          <option value="">选择一级分类 *</option>
          {topCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={form.subcategory}
          onChange={e=>handleFieldChange("subcategory", e.target.value)}
          disabled={!form.category}
          className="border p-2"
        >
          <option value="">选择二级分类 *</option>
          {childCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <button
        type="button"
        onClick={()=>setShowOptional(!showOptional)}
        className="w-full border p-2 mb-3"
      >
        {showOptional ? "收起选填项" : "展开选填项"}
      </button>

      {showOptional && (
        <>
          <textarea
            value={form.gallery_images}
            onChange={e=>handleFieldChange("gallery_images", e.target.value)}
            placeholder="多图链接，一行一个或逗号分隔"
            className="w-full border p-2 mb-3"
            rows={3}
          />

          <textarea
            value={form.description}
            onChange={e=>handleFieldChange("description", e.target.value)}
            placeholder="描述"
            className="w-full border p-2 mb-3"
          />

          <textarea
            value={form.specifications}
            onChange={e=>handleFieldChange("specifications", e.target.value)}
            placeholder="规格"
            className="w-full border p-2 mb-3"
          />

          <div className="flex gap-3 mb-3">
            <input
              value={form.price}
              onChange={e=>handleFieldChange("price", e.target.value)}
              placeholder="价格"
              type="number"
              step="0.01"
              className="flex-1 border p-2"
            />
            <input
              value={form.sort_order}
              onChange={e=>handleFieldChange("sort_order", e.target.value)}
              placeholder="排序"
              type="number"
              className="flex-1 border p-2"
            />
          </div>

          <div className="mb-4">
            <input
              checked={form.is_active}
              onChange={e=>handleFieldChange("is_active", e.target.checked)}
              type="checkbox"
            />
            <span> 上架产品</span>
          </div>
        </>
      )}

      {status.type === "error" && <p className="text-red-500 mb-2">{status.message}</p>}
      {status.type === "success" && <p className="text-green-600 mb-2">操作成功！</p>}

      <button
        disabled={status.type === "submitting"}
        className="w-full bg-black text-white py-3 rounded-lg disabled:bg-gray-400"
      >
        {status.type === "submitting" ? "提交中…" : editId ? "保存修改" : "提交录入"}
      </button>
    </form>
  )
}
