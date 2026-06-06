"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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
      setInitData(data)
    }
    getDetail()
  }, [id, cfg])

  if (!initData) return <div className="p-6">加载产品数据中...</div>
  return <ProductForm editId={String(id)} initForm={initData} />
}
