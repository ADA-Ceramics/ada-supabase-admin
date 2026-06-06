"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ProductForm } from "@/components/product-form"
import { loadConfig, makeClient } from "@/lib/supabase"

export default function EditProductPage() {
  const { id } = useParams()
  const [initData, setInitData] = useState(null)
  const cfg = loadConfig()

  useEffect(() => {
    if (!cfg || !id) return
    const sb = makeClient(cfg)
    const getDetail = async () => {
      const { data } = await sb.from("products").select("*").eq("id", id).single()
      // 把多图数组转成换行分隔的字符串，让表单能正常编辑
      if (data?.gallery_images) {
        data.gallery_images = data.gallery_images.join("\n")
      }
      setInitData(data)
    }
    getDetail()
  }, [id, cfg])

  if (!initData) return <div className="p-6 text-center">加载产品数据中...</div>

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-foreground">编辑产品</h1>
          <Link
            href="/admin/products"
            className="text-blue-600 underline hover:text-blue-800"
          >
            ← 返回产品列表
          </Link>
        </div>
        <ProductForm editId={String(id)} initForm={initData} />
      </div>
    </main>
  )
}
