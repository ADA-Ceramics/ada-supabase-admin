import { ProductForm } from "@/components/product-form"

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full">
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground text-balance">
          陶瓷产品录入
        </h1>
        <ProductForm />
      </div>
    </main>
  )
}
