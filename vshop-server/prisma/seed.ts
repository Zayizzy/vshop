import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.goodImage.deleteMany();
  await prisma.goodSupplier.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.good.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();

  // 分类
  const cats = await Promise.all([
    prisma.category.create({ data: { id: 'c1', name: '时令鲜果', sort: 1 } }),
    prisma.category.create({ data: { id: 'c2', name: '进口水果', sort: 2 } }),
    prisma.category.create({ data: { id: 'c3', name: '热带水果', sort: 3 } }),
    prisma.category.create({ data: { id: 'c4', name: '有机蔬菜', sort: 4 } }),
    prisma.category.create({ data: { id: 'c5', name: '根茎瓜果', sort: 5 } }),
    prisma.category.create({ data: { id: 'c6', name: '菌菇豆类', sort: 6 } }),
  ]);
  console.log(`Created ${cats.length} categories`);

  // 供应商
  const s1 = await prisma.supplier.create({ data: { id: 's1', name: '鲜果园旗舰店', deliveryRegions: ['厦门市','福州市','泉州市','漳州市','北京市','上海市','广州市','深圳市','杭州市','成都市'] } });
  const s2 = await prisma.supplier.create({ data: { id: 's2', name: '绿叶蔬菜直供', deliveryRegions: ['厦门市','漳州市','泉州市'] } });
  const s3 = await prisma.supplier.create({ data: { id: 's3', name: '热带果园直供', deliveryRegions: ['厦门市','福州市'] } });
  console.log(`Created 3 suppliers`);

  // 商品数据 — 与小程序前端 mock 数据对齐
  const products = [
    // 时令鲜果
    { catId: 'c1', subName: '瓜类', name: '麒麟西瓜', price: 29.9, marketPrice: 39.9, stock: 200, image: '/assets/images/watermelon.png', supplierId: 's1' },
    { catId: 'c1', subName: '瓜类', name: '哈密瓜', price: 32.8, marketPrice: 45.0, stock: 150, image: '/assets/images/hami.png', supplierId: 's1' },
    { catId: 'c1', subName: '浆果类', name: '丹东草莓', price: 58.0, marketPrice: 78.0, stock: 80, image: '/assets/images/strawberry.png', supplierId: 's1' },
    { catId: 'c1', subName: '浆果类', name: '进口蓝莓', price: 39.9, marketPrice: 0, stock: 60, image: '/assets/images/blueberry.png', supplierId: 's1' },
    { catId: 'c1', subName: '核果类', name: '阳山水蜜桃', price: 68.0, marketPrice: 0, stock: 40, image: '/assets/images/peach.png', supplierId: 's1' },
    { catId: 'c1', subName: '核果类', name: '进口车厘子', price: 98.0, marketPrice: 128.0, stock: 30, image: '/assets/images/cherry.png', supplierId: 's1' },
    // 进口水果
    { catId: 'c2', subName: '柑橘类', name: '赣南脐橙', price: 25.8, marketPrice: 0, stock: 300, image: '/assets/images/orange.png', supplierId: 's1' },
    { catId: 'c2', subName: '仁果类', name: '新疆阿克苏苹果', price: 29.9, marketPrice: 39.9, stock: 500, image: '/assets/images/apple.png', supplierId: 's1' },
    { catId: 'c2', subName: '仁果类', name: '阳光玫瑰葡萄', price: 55.0, marketPrice: 68.0, stock: 100, image: '/assets/images/grape.png', supplierId: 's1' },
    // 热带水果
    { catId: 'c3', subName: '榴莲山竹', name: '金枕榴莲', price: 158.0, marketPrice: 198.0, stock: 20, image: '/assets/images/durian.png', supplierId: 's3' },
    { catId: 'c3', subName: '芒果类', name: '海南芒果', price: 35.0, marketPrice: 0, stock: 120, image: '/assets/images/mango.png', supplierId: 's3' },
    // 有机蔬菜
    { catId: 'c4', subName: '叶菜类', name: '有机菠菜', price: 9.9, marketPrice: 15.0, stock: 200, image: '/assets/images/spinach.png', supplierId: 's2' },
    { catId: 'c4', subName: '叶菜类', name: '生菜', price: 5.9, marketPrice: 0, stock: 180, image: '/assets/images/lettuce.png', supplierId: 's2' },
    { catId: 'c4', subName: '茄果类', name: '普罗旺斯番茄', price: 12.8, marketPrice: 0, stock: 250, image: '/assets/images/tomato.png', supplierId: 's2' },
    { catId: 'c4', subName: '茄果类', name: '水果黄瓜', price: 9.9, marketPrice: 0, stock: 160, image: '/assets/images/cucumber.png', supplierId: 's2' },
    // 根茎瓜果
    { catId: 'c5', subName: '根茎类', name: '有机胡萝卜', price: 8.5, marketPrice: 0, stock: 300, image: '/assets/images/carrot.png', supplierId: 's2' },
    { catId: 'c5', subName: '根茎类', name: '新鲜土豆', price: 4.9, marketPrice: 0, stock: 400, image: '/assets/images/potato.png', supplierId: 's2' },
  ];

  for (let pi = 0; pi < products.length; pi++) {
    const p = products[pi];
    // Find or create sub-category
    let sub = await prisma.subCategory.findFirst({
      where: { categoryId: p.catId, name: p.subName },
    });
    if (!sub) {
      sub = await prisma.subCategory.create({
        data: { categoryId: p.catId, name: p.subName },
      });
    }

    // Create good
    const good = await prisma.good.create({
      data: {
        subCategoryId: sub.id,
        name: p.name,
        sales: Math.floor(Math.random() * 1500),
        status: p.stock > 0 ? 'active' : 'inactive',
        // 前 6 个商品标记为今日推荐
        isRecommended: pi < 6,
        recommendSort: pi < 6 ? pi : 0,
      },
    });

    // Create SKU（金额以「分」入库）
    const sku = await prisma.sku.create({
      data: {
        goodId: good.id,
        name: '默认规格',
        price: Math.round(p.price * 100),
        marketPrice: p.marketPrice ? Math.round(p.marketPrice * 100) : null,
        stock: p.stock,
      },
    });

    // Link to supplier（金额以「分」入库）
    await prisma.goodSupplier.create({
      data: {
        goodId: good.id,
        skuId: sku.id,
        supplierId: p.supplierId,
        price: Math.round(p.price * 100),
        stock: p.stock,
      },
    });

    // Add image
    if (p.image) {
      await prisma.goodImage.create({
        data: { goodId: good.id, url: p.image, sort: 0 },
      });
    }
  }

  console.log(`Created ${products.length} goods with SKUs, suppliers, and images`);
  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
