-- CreateTable: 首页轮播图
-- sort 越小越靠前；status=active 显示，inactive 隐藏
-- imageUrl 存 COS 图片地址；link 可选，点击跳转（商品详情/分类等小程序页面路径）

CREATE TABLE `Banner` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `imageUrl` LONGTEXT NOT NULL,
  `link` LONGTEXT NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 索引：列表查询按 status + sort
CREATE INDEX `Banner_status_sort_idx` ON `Banner`(`status`, `sort`);
