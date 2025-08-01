# TodoApp 后端API服务器

这是为Android TodoApp应用提供后端服务的Node.js API服务器，使用Supabase作为云数据库。

## 功能特性

- 用户注册和登录
- JWT身份验证
- 待办事项CRUD操作
- Supabase PostgreSQL云数据库
- 密码bcrypt加密存储
- 数据真正持久化

## API接口

### 用户认证

#### 注册用户
```
POST /api/register
Content-Type: application/json

{
  "username": "用户名",
  "email": "邮箱地址",
  "password": "密码"
}
```

#### 用户登录
```
POST /api/login
Content-Type: application/json

{
  "username": "用户名或邮箱",
  "password": "密码"
}
```

### 待办事项管理

#### 获取待办事项列表
```
GET /api/todos
Authorization: Bearer <token>
```

#### 创建待办事项
```
POST /api/todos
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "待办事项标题",
  "description": "描述（可选）"
}
```

#### 更新待办事项
```
PUT /api/todos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "更新的标题",
  "description": "更新的描述",
  "completed": true
}
```

#### 删除待办事项
```
DELETE /api/todos/:id
Authorization: Bearer <token>
```

## 部署信息

- **线上地址**: https://todo-app-backend-ten-gamma.vercel.app/
- **GitHub仓库**: https://github.com/StevenLiang026/TodoApp-Backend.git
- **自动部署**: GitHub推送自动触发Vercel部署

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动生产服务器
npm start
```

## 环境变量

- `JWT_SECRET`: JWT签名密钥（默认: todoapp_secret_key_2024）
- `NODE_ENV`: 运行环境（production/development）
- Supabase配置已内置在代码中

## Android应用集成

在你的Android应用中，你需要：

1. 添加网络权限到 `AndroidManifest.xml`
2. 使用HTTP客户端（如Retrofit或OkHttp）调用API
3. 存储JWT token用于身份验证
4. 处理API响应和错误

### 示例API调用

```bash
# 注册用户
curl -X POST https://todo-app-backend-ten-gamma.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123"
  }'

# 登录
curl -X POST https://todo-app-backend-ten-gamma.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# 获取待办事项（需要JWT令牌）
curl -X GET https://todo-app-backend-ten-gamma.vercel.app/api/todos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 数据库结构 (Supabase PostgreSQL)

### users表
- id: 用户ID（主键，自增）
- username: 用户名（唯一，VARCHAR）
- email: 邮箱（唯一，VARCHAR）
- password: bcrypt加密密码（VARCHAR）
- created_at: 创建时间（TIMESTAMP）
- updated_at: 更新时间（TIMESTAMP）

### todos表
- id: 待办事项ID（主键，自增）
- user_id: 用户ID（外键，关联users.id）
- title: 标题（VARCHAR，必填）
- description: 描述（TEXT，可选）
- completed: 完成状态（BOOLEAN，默认false）
- created_at: 创建时间（TIMESTAMP）
- updated_at: 更新时间（TIMESTAMP）

## 技术栈

- **后端框架**: Express.js
- **数据库**: Supabase PostgreSQL
- **身份验证**: JWT + bcryptjs
- **部署平台**: Vercel
- **版本控制**: Git + GitHub
