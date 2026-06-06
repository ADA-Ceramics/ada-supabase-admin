"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { loadConfig, makeClient } from "@/lib/supabase"

type ProductItem = { id:string; name:string; slug:string }

export default function ProductListPage() {
  const [list, setList] = useState<ProductItem[]>([])
  const config = loadConfig()

  useEffect(() => {
    if (!config) return
    const sb = makeClient(config)
    sb.from("products").select("id,name,slug").order("name")
      .then(res => setList(res.data ?? []))
  }, [config])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">产品管理列表</h2>
        {/* 跳转去新增表单，也就是你原来首页录入页 */}
        <Link href="/admin/products/new" className="bg-black text-white px-4 py-2 rounded hover:opacity-90">
          + 新增产品
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="text-gray-500">暂无产品，先去新增吧</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(item => (
            <div key={item.id} className="border p-4 flex justify-between items-center rounded-lg">
              <span>{item.name}</span>
              <Link href={`/admin/products/edit/${item.id}`} className="text-blue-600 underline hover:text-blue-800">
                编辑
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
