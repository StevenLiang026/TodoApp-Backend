# TodoApp 后端API服务器

这是为Android TodoApp应用提供后端服务的Node.js API服务器。

## 功能特性

- 用户注册和登录
- JWT身份验证
- 待办事项CRUD操作
- SQLite数据库存储
- 密码加密存储

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

## 部署到Vercel

1. 将代码推送到GitHub仓库
2. 在Vercel中导入项目
3. 设置环境变量（如果需要）
4. 部署完成

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

- `JWT_SECRET`: JWT签名密钥（生产环境建议设置复杂密钥）
- `NODE_ENV`: 运行环境（production/development）

## Android应用集成

在你的Android应用中，你需要：

1. 添加网络权限到 `AndroidManifest.xml`
2. 使用HTTP客户端（如Retrofit或OkHttp）调用API
3. 存储JWT token用于身份验证
4. 处理API响应和错误

### 示例API调用（Java/Kotlin）

```java
// 注册用户
POST https://your-vercel-app.vercel.app/api/register
{
  "username": "testuser",
  "email": "test@example.com", 
  "password": "password123"
}

// 登录
POST https://your-vercel-app.vercel.app/api/login
{
  "username": "testuser",
  "password": "password123"
}
```

## 数据库结构

### users表
- id: 用户ID（主键）
- username: 用户名（唯一）
- email: 邮箱（唯一）
- password: 加密密码
- created_at: 创建时间

### todos表
- id: 待办事项ID（主键）
- user_id: 用户ID（外键）
- title: 标题
- description: 描述
- completed: 完成状态
- created_at: 创建时间
- updated_at: 更新时间