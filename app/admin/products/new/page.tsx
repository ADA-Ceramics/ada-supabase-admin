import { ProductForm } from "@/components/product-form"
import Link from "next/link"

export default function NewProductPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-foreground text-balance">
            陶瓷产品录入
          </h1>
          {/* 新增返回列表按钮 */}
          <Link
            href="/admin/products"
            className="text-blue-600 underline hover:text-blue-800"
          >
            ← 返回产品列表
          </Link>
        </div>
        <ProductForm />
      </div>
    </main>
  )
}
