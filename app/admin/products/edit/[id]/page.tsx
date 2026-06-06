"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ProductForm } from "@/components/product-form"
import { loadConfig, makeClient } from "@/lib/supabase"

export default function EditProductPage() {
  const { id } = useParams()
  const [initData, setInitData] = useState(null)
  const config = loadConfig()

  // 防崩溃：没有ID直接返回
  if (!id) {
    return <div className="p-6 text-center text-red-500">无效的产品ID</div>
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sb = makeClient(config)
        const { data, error } = await sb
          .from("products")
          .select("*")
          .eq("id", id)
          .single()

        if (error || !data) {
          console.error("获取数据失败", error)
          return
        }

        // 格式转换
        data.gallery_images = data.gallery_images ? data.gallery_images.join("\n") : ""
        data.price = data.price ? String(data.price) : ""
        data.sort_order = data.sort_order ? String(data.sort_order) : ""

        setInitData(data)
      } catch (e) {
        console.error("编辑页加载失败", e)
      }
    }

    if (config) fetchData()
  }, [id, config])

  // 加载状态
  if (!initData) {
    return <div className="p-6 text-center">加载产品数据中...</div>
  }

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

        {/* 关键：确保不会传 null 进去炸掉 */}
        <ProductForm editId={String(id)} initForm={initData} />
      </div>
    </main>
  )
}
