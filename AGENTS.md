# Admin Console AI Rules

本文件是给 AI/自动化工具的项目规则。目标：后续所有新增功能都保持与当前项目一致的技术栈、目录结构、代码风格与交付标准。

## 技术栈（不要自行替换）
- 框架：Next.js（App Router）+ TypeScript
- UI：Ant Design（antd v6）
- 鉴权：NextAuth（Credentials）
- DB：PostgreSQL
- ORM：Prisma（当前锁定在 `prisma/@prisma/client` v6.x；不要升级到 v7）
- 包管理：pnpm
- 部署：Docker Compose + Nginx（可选）

## 目录与分层（保持一致）
- 页面（App Router）：`src/app/**`
  - 登录：`src/app/login/*`
  - 业务区（需要登录）：`src/app/(app)/*`
- API（REST）：`src/app/api/**`（优先 REST，避免把核心业务只写成 Server Actions，便于未来 App 复用）
- 共享库：
  - Prisma：`src/lib/prisma.ts`（复用单例）
  - 鉴权：`src/lib/auth.ts`
  - 密码：`src/lib/password.ts`
- 类型扩展：`src/types/next-auth.d.ts`
- 中间件：`src/middleware.ts`（保护除 `/login` 外的页面路由）

## 代码风格与约定
- 默认使用英文命名（变量/函数/文件），UI 文案使用中文。
- 不引入新的状态管理库（如 Redux/Zustand）除非明确需要。
- UI：优先使用 AntD 组件组合；样式以 AntD 为主，少量 `style={{...}}` 允许，但避免大段自定义 CSS。
- 新增页面如果需要 React hooks/浏览器 API：
  - 将交互部分写成 Client Component（`"use client"`）
  - 页面文件 `page.tsx` 尽量保持为 Server Component 包一层（参考 `src/app/login/page.tsx` + `LoginClient.tsx` 的拆分）
- 禁止随意改变现有路由/目录分组（如 `(app)`）。

## API 设计规则（严格）
- 所有 `src/app/api/**`：
  - 先 `getServerSession(authOptions)` 校验登录；未登录返回 `401`
  - 入参校验用 `zod`（query/body 都要校验）
  - 响应结构统一：
    - 成功：`{ data: ... }`
    - 失败：`{ error: string, issues?: ... }`（400/401/404/409 等）
  - 使用 `NextResponse.json(...)` 返回
- Prisma 错误处理：
  - 唯一键冲突（P2002）返回 `409`
- Next 16 路由参数：
  - 动态段 handler 形参使用 `context: { params: Promise<{ id: string }> }` 并 `await context.params`

## 数据库/Prisma 规则
- 修改 `prisma/schema.prisma` 后：
  - 必须运行并确保通过：`pnpm prisma:generate`
- 本项目目前使用 `prisma db push`（开发/私有化快速落地）；不要擅自切换到 migrate 工作流，除非用户明确要求。
- Seed：
  - 入口：`prisma/seed.mjs`
  - 命令：`pnpm db:seed`

## 鉴权规则（不要绕过）
- 业务页面放在 `src/app/(app)` 下，并由 `src/middleware.ts` 统一保护。
- `/login` 必须可访问且不被 middleware 拦截。
- 任何新增“管理功能”默认需要登录（除非用户明确说公开页面）。

## UI/后台交互规则
- 列表页：优先 AntD `Table` + 服务器分页（通过 REST 参数 `page/pageSize/q`）
- 表单：优先 AntD `Form`，弹窗编辑用 `Modal`
- 统一反馈：成功/失败用 `message.success/error`

## Docker/部署规则
- 保持 `docker-compose.yml` 可直接启动（`web + db + nginx`）。
- 不要把敏感信息写死在代码里：
  - 仅在 `.env.example` 提供示例
  - 生产环境通过环境变量注入（尤其 `NEXTAUTH_SECRET`、`DATABASE_URL`）

## 交付标准（Definition of Done）
- `pnpm lint` 通过（无 error；warning 尽量为 0）
- `pnpm build` 通过
- 新功能有可访问的入口（菜单/按钮/路由），并符合现有 UI 风格
- 若新增环境变量或启动步骤，更新 `README.md`

