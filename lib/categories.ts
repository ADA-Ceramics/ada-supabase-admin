// 一级分类与二级分类联动数据，严格对齐独立站分类体系。
// 写入数据库时：category 存一级值，subcategory 存二级值。

export const CATEGORY_MAP: Record<string, string[]> = {
  "Wholesale Plates": [
    "Dinner Plates",
    "Dessert & Side Plates",
    "Soup Plates",
    "Oval & Serving Plates",
  ],
  "Wholesale Bowls": [
    "Soup Bowls",
    "Salad Bowls",
    "Ramen Bowls",
    "Snack Bowls",
  ],
  "Wholesale Dinnerware Sets": [
    "Daily Tableware Sets",
    "Restaurant & Catering Sets",
  ],
  "Wholesale Cups & Mugs": [
    "Ceramic Mugs",
    "Coffee Cups & Saucers",
    "Water Cups",
  ],
  "Wholesale Bakeware": [
    "Baking Dishes",
    "Ramekins",
    "Pie & Pizza Plates",
  ],
}

export const PRIMARY_CATEGORIES = Object.keys(CATEGORY_MAP)
