"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ProductForm } from "@/components/product-form"
import { loadConfig, makeClient } from "@/lib/supabase"

export default function EditProductPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const config = loadConfig()

  if (!id) return <div className="p-6 text-center text-red-500">无效ID</div>

  useEffect(() => {
    if (!config) return
    const fetch = async () => {
      try {
        const sb = makeClient(config)
        const { data, error } = await sb
          .from("products")
          .select("*")
          .eq("id", id)
          .single()

        if (error || !data) return

       data.gallery_images = Array.isArray(data.gallery_images)
  ? data.gallery_images.join(",")   // 换行 \n → 逗号 ,
  : data.gallery_images || ""
        data.price = data.price?.toString() || ""
        data.sort_order = data.sort_order?.toString() || ""

        setData(data)
      } catch (e) {}
    }
    fetch()
  }, [id, config])

  if (!data) return <div className="p-6 text-center">加载中...</div>

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">编辑产品</h1>
        <Link href="/admin/products" className="text-blue-600 underline">← 返回列表</Link>
      </div>
      <ProductForm editId={String(id)} initForm={data} />
    </main>
  )
}
