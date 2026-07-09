# Dockerfile for WeChat Cloud Run (微信云托管)
# 构建上下文 = 项目根目录（包含 vshop-server/ 和 miniprogram/）
# 在微信云托管控制台配置：
#   Dockerfile 路径: Dockerfile
#   构建上下文: ./
#   监听端口: 3000

FROM node:22-alpine AS build
WORKDIR /app

# 先复制 package 文件，利用 Docker 层缓存
COPY vshop-server/package*.json ./

# 安装全部依赖（含 devDependencies，构建阶段需要）
RUN npm ci

# 复制后端源码
COPY vshop-server/ ./

# 复制小程序静态资源（main.ts 引用 ../miniprogram/assets）
COPY miniprogram/assets /app/miniprogram/assets

# 生成 Prisma Client + 构建
RUN npx prisma generate
RUN npm run build

# 移除 devDependencies，减小生产镜像体积
# prisma 已在 dependencies 中，migrate deploy 可正常执行
RUN npm prune --production

# --- 运行阶段 ---
FROM node:22-alpine
WORKDIR /app

# 复制构建产物和运行时依赖
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY --from=build /app/start.sh ./start.sh

# 复制小程序静态资源（与 main.ts 中的路径 ../miniprogram/assets 对应）
COPY --from=build /app/miniprogram/assets /app/miniprogram/assets

# 确保启动脚本有执行权限
RUN chmod +x start.sh

EXPOSE 3000

# 启动时先执行数据库迁移，再启动应用
CMD ["sh", "start.sh"]
