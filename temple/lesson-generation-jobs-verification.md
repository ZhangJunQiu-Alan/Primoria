# Lesson Generation Jobs — 验证手册（你自己跑）

本轮改动：删除旧 `course_generation_jobs`（代码 + `DROP TABLE`）、移除同步 `generateCourse`（course-chat 改为只答疑）、新增 §17 测试（隔离测试库 + 纯逻辑单测）。下面是验证步骤，全部可直接复制执行。

工作目录：`/Users/zhangjunqiu/Desktop/primoria`

## 0. 安全约束（已用代码强制，无需手动保证）
- DB 测试只跑在**本地独立 Postgres**，库名必须含 `test`。
- harness 双重 guard：`TEST_DATABASE_URL` 必须与 `DATABASE_URL` 不同且库名含 `test`；`resetTestDb()` 会查 `current_database()`，名字不含 `test` 直接拒绝 truncate。
- **禁止**把 `TEST_DATABASE_URL` 指向 Supabase；正式库只跑迁移和只读检查。

## 1. 编译 + 静态检查（非破坏）
```bash
pnpm --filter @primoria/web typecheck
pnpm --filter @primoria/web lint
```
预期：两条命令均无输出报错（exit 0）。

## 2. 纯逻辑 / 进程内单测（不连库，非破坏）
```bash
pnpm --filter @primoria/web test:lesson-jobs
```
预期看到三行：
```
[lesson-generation-jobs.unit] ALL CHECKS PASSED
[lesson-generation-processor.unit] ALL CHECKS PASSED
[lesson-generation-labels.unit] ALL CHECKS PASSED
```

## 3. DB 测试（本地独立 Postgres）

### 3a. 起一个一次性本地 Postgres（Docker）
```bash
docker rm -f pg-primoria-test 2>/dev/null
docker run -d --name pg-primoria-test \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=primoria_test \
  -p 5433:5432 postgres:16-alpine
# 等就绪
until docker exec pg-primoria-test pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
echo ready
```
（若之前那个容器还在，可跳过，直接用 5433。）

### 3b. 跑 DB 测试
```bash
cd apps/web
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5433/primoria_test" \
  pnpm test:lesson-jobs:db
```
预期：harness 自动迁移测试库，然后大量 `✓`，最后两行：
```
[lesson-generation-store.db] ALL CHECKS PASSED
[lesson-generation-worker.db] ALL CHECKS PASSED
```
覆盖 §17：enqueue/幂等/并发认领/租约过期重认领/新租约 token/旧 token 全部被拒（heartbeat/stage/progress/checkpoint/fail/publish）/心跳续租/完成不可重认领/手动重试重置 attempts/所有权隔离；checkpoint 幂等 + 版本回写 + 围栏删除；Worker：整条成功、断点续跑只补缺失批次、过期后旧 worker 不能发布。

> 不设 `TEST_DATABASE_URL`（或指向非 test 库）时，DB 测试会**跳过并打印原因**，不会碰任何库——这是预期行为。

### 3c. 清理
```bash
docker rm -f pg-primoria-test
```

## 4. 正式库（Supabase）只跑迁移（非破坏）
本轮两个迁移已在当前 dev 库执行过：`0024`（建 lesson 表 + 把卡住的 `generating` lesson 重置为 `planned`）、`0025`（`DROP TABLE course_generation_jobs`，该表此前已是死代码、恒空）。如需在其它环境同步：
```bash
pnpm --filter @primoria/web db:migrate
```
该命令只按 `drizzle/` 顺序执行迁移，不会清空业务数据。

## 5. 端到端联调（可选，需模型环境）
```bash
pnpm dev          # 同时起 web + agent + lesson worker
```
从首页发起建课 → 应立即出现课程卡片且“第一节课生成中” → Library 行/课程详情依次推进 `planning → writing X/Y → validating → saving → Ready`；中途关页面 worker 仍会完成；失败可在课程页 Retry。

## 排错
- DB 测试报 “refusing to truncate non-test database”：说明 `TEST_DATABASE_URL` 库名不含 `test`，按 3a 用 `primoria_test`。
- `ECONNREFUSED localhost:5433`：容器没起好，重跑 3a。
- 端口冲突：把 `5433` 换成空闲端口，并同步改 `TEST_DATABASE_URL`。
