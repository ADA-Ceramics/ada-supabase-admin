"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { loadConfig, makeClient } from "@/lib/supabase"

type ProItem = { id:string; name:string; slug:string }
export default function ProductList(){
  const [list, setList] = useState<ProItem[]>([])
  const cfg = loadConfig()

  useEffect(()=>{
    if(!cfg) return
    const sb = makeClient(cfg)
    sb.from("products").select("id,name,slug").order("name")
      .then(res=>setList(res.data ?? []))
  },[cfg])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">产品管理列表</h2>
        <Link href="/admin/products/new" className="bg-black text-white px-3 py-2 rounded">+新增产品</Link>
      </div>
      <div className="flex flex-col gap-3">
        {list.map(item=>(
          <div key={item.id} className="border p-3 flex justify-between items-center rounded">
            <span>{item.name}</span>
            <Link href={`/admin/products/edit/${item.id}`} className="text-blue-600">编辑</Link>
          </div>
        ))}
      </div>
    </div>
  )
}