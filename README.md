# Admin Console

技术栈：`Next.js(App Router) + TypeScript + Ant Design + NextAuth(Credentials) + Prisma + PostgreSQL`。

## 本地开发

1. 准备环境变量：复制 `.env.example` 为 `.env` 并按需修改
2. 启动数据库（推荐）：`docker compose up -d db`
3. 同步表结构并创建管理员：
   - `pnpm db:push`
   - `pnpm db:seed`
4. 启动开发：`pnpm dev`

访问：`http://localhost:3000`（默认管理员：`admin@example.com` / `Admin123!`）

## 私有化部署（Docker）

1. 修改 `docker-compose.yml` 里的 `NEXTAUTH_SECRET`
2. 启动：`docker compose up -d --build`
3. 初始化管理员（只需执行一次）：
   - `docker compose exec web pnpm db:seed`

访问：
- 直连：`http://<host>:3000`
- Nginx 反代：`http://<host>/`
