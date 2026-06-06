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
  main_image_alt: string
  category: string
  subcategory: string
  gallery_images: string
  gallery_images_alt: string[]
  description: string
  specs_size: string
  specs_color: string[]
  specs_weight: string
  specs_material: "Porcelain" | "Stoneware" | "New Born China"
  is_active: boolean
  price: string
  sort_order: string
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  main_image: "",
  main_image_alt: "",
  category: "",
  subcategory: "",
  gallery_images: "",
  gallery_images_alt: [""],
  description: "",
  specs_size: "",
  specs_color: [""],
  specs_weight: "",
  specs_material: "Porcelain",
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

export function ProductForm({
  editId = null,
  initForm = null,
}: {
  editId?: string | null
  initForm?: Partial<FormState> & {
    specifications?: {
      size?: string
      color?: string[]
      weight?: string
      material?: "Porcelain" | "Stoneware" | "New Born China"
    }
  } | null
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

  // 初始化表单数据
  useEffect(() => {
    if (initForm && !form.name) {
      const specs = initForm.specifications || {}
      setForm({
        ...EMPTY_FORM,
        ...initForm,
        specs_size: specs.size || "",
        specs_color: Array.isArray(specs.color) && specs.color.length
          ? specs.color
          : [""],
        specs_weight: specs.weight || "",
        specs_material: specs.material || "Porcelain",
        gallery_images_alt: Array.isArray(initForm.gallery_images_alt) && initForm.gallery_images_alt.length
          ? initForm.gallery_images_alt
          : [""],
        price: initForm.price?.toString() || "",
        sort_order: initForm.sort_order?.toString() || "",
        gallery_images: Array.isArray(initForm.gallery_images)
          ? initForm.gallery_images.join(",")
          : initForm.gallery_images || "",
      })
    }
  }, [initForm, form.name])

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

  // 颜色处理
  const handleColorChange = (idx: number, val: string) => {
    const newColors = [...form.specs_color]
    newColors[idx] = val
    handleFieldChange("specs_color", newColors)
  }
  const addColorRow = () => handleFieldChange("specs_color", [...form.specs_color, ""])
  const removeColorRow = (idx: number) => {
    if (form.specs_color.length <= 1) return
    handleFieldChange("specs_color", form.specs_color.filter((_, i) => i !== idx))
  }

  // 多图 alt 处理
  const handleGalleryAltChange = (idx: number, val: string) => {
    const newAlts = [...form.gallery_images_alt]
    newAlts[idx] = val
    handleFieldChange("gallery_images_alt", newAlts)
  }
  const addGalleryAltRow = () => handleFieldChange("gallery_images_alt", [...form.gallery_images_alt, ""])
  const removeGalleryAltRow = (idx: number) => {
    if (form.gallery_images_alt.length <= 1) return
    handleFieldChange("gallery_images_alt", form.gallery_images_alt.filter((_, i) => i !== idx))
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

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    if (!form.name || !form.slug || !form.main_image || !form.category || !form.subcategory) {
      setStatus({ type: "error", message: "必填项不能为空" })
      return
    }

    setStatus({ type: "submitting" })

    try {
      const galleryArr = form.gallery_images
        .split(/[\n,]/)
        .map(i => i.trim())
        .filter(Boolean)
      const cleanColors = form.specs_color.map(c => c.trim()).filter(Boolean)
      const cleanGalleryAlts = form.gallery_images_alt.map(a => a.trim()).filter(Boolean)

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        main_image: form.main_image.trim(),
        main_image_alt: form.main_image_alt.trim() || null,
        category: form.category,
        subcategory: form.subcategory,
        gallery_images: galleryArr,
        gallery_images_alt: cleanGalleryAlts.length ? cleanGalleryAlts : null,
        description: form.description.trim() || null,
        specifications: {
          size: form.specs_size.trim() || null,
          color: cleanColors,
          weight: form.specs_weight.trim() || null,
          material: form.specs_material,
        },
        is_active: form.is_active,
        price: form.price?.trim() ? Number(form.price) : null,
        sort_order: form.sort_order?.trim() ? Number(form.sort_order) : null,
      }

      const sb = makeClient(config)

      if (editId) {
        const { error } = await sb
          .from("products")
          .update(payload)
          .eq("id", editId)
        if (error) throw error
      } else {
        const { error } = await sb.from("products").insert(payload)
        if (error) throw error
      }

      setStatus({ type: "success", name: form.name })

      if (!editId) {
        setForm(EMPTY_FORM)
        setShowOptional(false)
      }

    } catch (err: any) {
      console.error("提交失败：", err)
      setStatus({ type: "error", message: err.message || "提交失败" })
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
          <input 
            value={form.name} 
            onChange={e=>handleFieldChange("name",e.target.value)} 
            className="border rounded w-full px-3 py-2" 
            placeholder="例如：8英寸陶瓷餐盘"
          />
        </label>
        <label>URL别名 slug*
          <input 
            value={form.slug} 
            onChange={e=>handleFieldChange("slug",e.target.value)} 
            className="border rounded w-full px-3 py-2" 
            placeholder="8-inch-ceramic-dinner-plate"
          />
        </label>
        <label>主图链接 main_image*
          <input 
            type="url" 
            value={form.main_image} 
            onChange={e=>handleFieldChange("main_image",e.target.value)} 
            className="border rounded w-full px-3 py-2"
          />
        </label>
        {/* 新增：主图 alt 文本 */}
        <label>主图 alt 文本（SEO优化）
          <input 
            value={form.main_image_alt} 
            onChange={e=>handleFieldChange("main_image_alt",e.target.value)} 
            className="border rounded w-full px-3 py-2" 
            placeholder="例如：White rectangular porcelain dinner plate set of 3"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label>一级分类 category*
            <select 
              value={form.category} 
              onChange={e=>handleFieldChange("category",e.target.value)} 
              className="border rounded w-full px-3 py-2"
            >
              <option value="">请选择</option>
              {topCats.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          
          <label>二级分类 subcategory*
            <select 
              disabled={!form.category} 
              value={form.subcategory} 
              onChange={e=>handleFieldChange("subcategory",e.target.value)} 
              className="border rounded w-full px-3 py-2 disabled:opacity-50"
            >
              <option value="">{form.category ? "请选择" : "请先选一级分类"}</option>
              {childCats.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <button type="button" onClick={()=>setShowOptional(!showOptional)} className="w-full border rounded py-2 mt-5 flex justify-between px-3">
        <span>选填信息 & 规格</span>
        <span>{showOptional ? "收起 −" : "展开 +"}</span>
      </button>

      {showOptional && (
        <div className="mt-4 flex flex-col gap-4">
          <label>多图链接（换行/逗号分隔）
            <textarea 
              rows={3} 
              value={form.gallery_images} 
              onChange={e=>handleFieldChange("gallery_images",e.target.value)} 
              className="border rounded w-full px-3 py-2"
            />
          </label>
          {/* 新增：多图 alt 文本 */}
          <label>多图 alt 文本（对应上面的图片顺序）
            {form.gallery_images_alt.map((alt, idx) => (
              <div key={idx} className="flex gap-2 mt-2">
                <input
                  value={alt}
                  onChange={e=>handleGalleryAltChange(idx, e.target.value)}
                  className="border rounded flex-1 px-3 py-2"
                  placeholder={`图片 ${idx+1} alt 文本`}
                />
                <button
                  type="button"
                  onClick={()=>removeGalleryAltRow(idx)}
                  className="px-3 py-2 border rounded"
                >−</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addGalleryAltRow}
              className="mt-2 px-3 py-2 border rounded"
            >+ 增加 alt 文本</button>
          </label>

          <label>描述 description
            <textarea 
              rows={3} 
              value={form.description} 
              onChange={e=>handleFieldChange("description",e.target.value)} 
              className="border rounded w-full px-3 py-2"
            />
          </label>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">产品规格</h3>

            <div className="grid grid-cols-2 gap-4">
              <label>尺寸 size
                <input
                  value={form.specs_size}
                  onChange={e=>handleFieldChange("specs_size", e.target.value)}
                  className="border rounded w-full px-3 py-2"
                  placeholder="例如：20x20x5 cm"
                />
              </label>

              <label>重量 weight
                <input
                  value={form.specs_weight}
                  onChange={e=>handleFieldChange("specs_weight", e.target.value)}
                  className="border rounded w-full px-3 py-2"
                  placeholder="例如：0.8 kg"
                />
              </label>
            </div>

            <label className="mt-4 block">
              颜色 color（可多填）
              {form.specs_color.map((c, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <input
                    value={c}
                    onChange={e=>handleColorChange(idx, e.target.value)}
                    className="border rounded flex-1 px-3 py-2"
                    placeholder="例如：White, Blue"
                  />
                  <button
                    type="button"
                    onClick={()=>removeColorRow(idx)}
                    className="px-3 py-2 border rounded"
                  >−</button>
                </div>
              ))}
              <button
                type="button"
                onClick={addColorRow}
                className="mt-2 px-3 py-2 border rounded"
              >+ 增加颜色</button>
            </label>

            <label className="mt-4 block">
              材质 material
              <select
                value={form.specs_material}
                onChange={e=>handleFieldChange("specs_material", e.target.value as any)}
                className="border rounded w-full px-3 py-2"
              >
                <option value="Porcelain">Porcelain</option>
                <option value="Stoneware">Stoneware</option>
                <option value="New Born China">New Born China</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label>批发价 price
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={e=>handleFieldChange("price",e.target.value)}
                className="border rounded w-full px-3 py-2"
              />
            </label>
            <label>排序 sort_order
              <input
                type="number"
                value={form.sort_order}
                onChange={e=>handleFieldChange("sort_order",e.target.value)}
                className="border rounded w-full px-3 py-2"
              />
            </label>
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
