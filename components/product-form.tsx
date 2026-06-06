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

type CategoryItem = { id: string; name: string }

// 新增：支持编辑模式的参数
export function ProductForm({
  editId = null,
  initForm = null,
}: {
  editId?: string | null
  initForm?: FormState | null
}) {
  const [config, setConfig] = useState<SupabaseConfig | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [keyInput, setKeyInput] = useState("")

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showOptional, setShowOptional] = useState(false)
  const [status, setStatus] = useState<Status>({ type: "idle" })

  const [topCats, setTopCats] = useState<CategoryItem[]>([])
  const [childCats, setChildCats] = useState<CategoryItem[]>([])
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // 编辑模式：自动回填数据
  useEffect(() => {
    if (initForm) {
      setForm(initForm)
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

  // 查询一级分类
  useEffect(() => {
    if (!config) return
    let abort = false
    const fetchTop = async () => {
      try {
        const sb = makeClient(config)
        const { data, error } = await sb
          .from("product_categories")
          .select("id,name")
          .eq("tier", 1)
          .order("name")
        if (abort) return
        if (error) throw error
        setTopCats(data ?? [])
        setErrMsg(null)
      } catch (e) {
        setErrMsg("读取一级分类失败")
      }
    }
    fetchTop()
    return () => { abort = true }
  }, [config])

  // 查询二级分类
  useEffect(() => {
    if (!config || !form.category) {
      setChildCats([])
      return
    }
    let abort = false
    const fetchChild = async () => {
      const sb = makeClient(config)
      const { data } = await sb
        .from("product_categories")
        .select("id,name")
        .eq("tier", 2)
        .eq("parent_id", form.category)
        .order("name")
      if (!abort) setChildCats(data ?? [])
    }
    fetchChild()
    return () => { abort = true }
  }, [config, form.category])

  const handleFieldChange = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    if (key === "category") {
      setForm(prev => ({ ...prev, category: val, subcategory: "" }))
    } else {
      setForm(prev => ({ ...prev, [key]: val }))
    }
  }

  const saveSbConfig = (e: React.FormEvent) => {
    e.preventDefault()
    const cfg: SupabaseConfig = { url: urlInput.trim(), anonKey: keyInput.trim() }
    saveConfig(cfg)
    setConfig(cfg)
  }

  const resetSb = () => {
    clearConfig()
    setConfig(null)
  }

  // 提交：支持 新增 / 编辑
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    if (!form.name || !form.slug || !form.main_image || !form.category || !form.subcategory) {
      setStatus({ type: "error", message: "必填项不能为空" })
      return
    }

    setStatus({ type: "submitting" })
    const galleryArr = form.gallery_images.split(/[,\\n]/).map(i => i.trim()).filter(Boolean)

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      main_image: form.main_image.trim(),
      category: form.category,
      subcategory: form.subcategory,
      gallery_images: galleryArr,
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      is_active: form.is_active,
      price: form.price ? Number(form.price) : null,
      sort_order: form.sort_order ? Number(form.sort_order) : null
    }

    try {
      const sb = makeClient(config)

      if (editId) {
        // 编辑模式：更新数据
        const { error } = await sb
          .from("products")
          .update(payload)
          .eq("id", editId)
        if (error) throw error
      } else {
        // 新增模式：插入数据
        const { error } = await sb.from("products").insert(payload)
        if (error) throw error
      }

      setStatus({ type: "success", name: form.name })

      if (!editId) {
        setForm(EMPTY_FORM)
        setShowOptional(false)
      }

    } catch (err) {
      console.log("完整提交错误详情：", err)
      setStatus({ type: "error", message: err instanceof Error ? err.message : `提交异常:${String(err)}` })
    }
  }

  if (!config) {
    return (
      <form onSubmit={saveSbConfig} className="max-w-md mx-auto border rounded-xl p-6">
        <h2 className="text-lg font-semibold">连接Supabase</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label>Supabase URL<input required value={urlInput} onChange={e=>setUrlInput(e.target.value)} className="border rounded px-2 py-1.5 w-full"/></label>
          <label>Anon Key<input required value={keyInput} onChange={e=>setKeyInput(e.target.value)} className="border rounded px-2 py-1.5 w-full"/></label>
        </div>
        <button type="submit" className="bg-black text-white w-full py-2 rounded mt-5">保存连接</button>
      </form>
    )
  }

  return (
    <form onSubmit={submitForm} className="max-w-2xl mx-auto border rounded-xl p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">
          {editId ? "编辑产品" : "录入产品"}
        </h2>
        <button type="button" onClick={resetSb} className="text-sm text-gray-500 underline">重设连接</button>
      </div>
      {errMsg && <p className="text-red-500 text-sm mb-3">{errMsg}</p>}

      <div className="flex flex-col gap-4">
        <label>产品名 name*
          <input value={form.name} onChange={e=>handleFieldChange("name",e.target.value)} className="border rounded w-full px-3 py-2" placeholder="例如：8英寸陶瓷餐盘"/>
        </label>
        <label>URL别名 slug*
          <input value={form.slug} onChange={e=>handleFieldChange("slug",e.target.value)} className="border rounded w-full px-3 py-2" placeholder="8-inch-ceramic-dinner-plate"/>
        </label>
        <label>主图链接 main_image*
          <input type="url" value={form.main_image} onChange={e=>handleFieldChange("main_image",e.target.value)} className="border rounded w-full px-3 py-2"/>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label>一级分类 category*
            <select value={form.category} onChange={e=>handleFieldChange("category",e.target.value)} className="border rounded w-full px-3 py-2">
              <option value="">请选择</option>
              {topCats.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          
          <label>二级分类 subcategory*
            <select disabled={!form.category} value={form.subcategory} onChange={e=>handleFieldChange("subcategory",e.target.value)} className="border rounded w-full px-3 py-2 disabled:opacity-50">
              <option value="">{form.category ? "请选择" : "请先选一级分类"}</option>
              {childCats.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <button type="button" onClick={()=>setShowOptional(!showOptional)} className="w-full border rounded py-2 mt-5 flex justify-between px-3">
        <span>选填信息</span>
        <span>{showOptional ? "收起 −" : "展开 +"}</span>
      </button>

      {showOptional && (
        <div className="mt-4 flex flex-col gap-4">
          <label>多图（换行/逗号分隔）
            <textarea rows={3} value={form.gallery_images} onChange={e=>handleFieldChange("gallery_images",e.target.value)} className="border rounded w-full px-3 py-2"/>
          </label>
          <label>描述 description
            <textarea rows={3} value={form.description} onChange={e=>handleFieldChange("description",e.target.value)} className="border rounded w-full px-3 py-2"/>
          </label>
          <label>规格 specifications
            <textarea rows={3} value={form.specifications} onChange={e=>handleFieldChange("specifications",e.target.value)} className="border rounded w-full px-3 py-2"/>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label>批发价 price<input type="number" step="0.01" value={form.price} onChange={e=>handleFieldChange("price",e.target.value)} className="border rounded w-full px-3 py-2"/></label>
            <label>排序 sort_order<input type="number" value={form.sort_order} onChange={e=>handleFieldChange("sort_order",e.target.value)} className="border rounded w-full px-3 py-2"/></label>
          </div>
          <label className="flex items-center gap-2">
            <input checked={form.is_active} onChange={e=>handleFieldChange("is_active",e.target.checked)} type="checkbox"/>
            上架产品
          </label>
        </div>
      )}

      {status.type === "error" && <p className="text-red-500 mt-4">{status.message}</p>}
      {status.type === "success" && <p className="text-green-600 mt-4">已成功{editId ? "更新" : "录入"}：{status.name}</p>}

      <button disabled={status.type === "submitting"} className="bg-black text-white w-full py-3 rounded-lg mt-5 disabled:opacity-60">
        {status.type === "submitting" ? "提交中…" : editId ? "保存修改" : "提交录入"}
      </button>
    </form>
  )
}
