const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'todoapp_secret_key_2024';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 数据库初始化 - 使用持久化数据库
const dbPath = './todoapp.db';
const db = new sqlite3.Database(dbPath);

// 创建用户表
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

// JWT验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的访问令牌' });
        }
        req.user = user;
        next();
    });
};

// 根路由
app.get('/', (req, res) => {
    res.json({ 
        message: 'TodoApp 后端API服务器运行中',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            todos: 'GET/POST /api/todos',
            todo: 'PUT/DELETE /api/todos/:id'
        }
    });
});

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: '用户名、邮箱和密码都是必填项' });
        }

        // 检查用户是否已存在
        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }

            if (row) {
                return res.status(400).json({ error: '用户名或邮箱已存在' });
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);

            // 插入新用户
            db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
                [username, email, hashedPassword], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: '注册失败' });
                    }

                    const token = jwt.sign(
                        { userId: this.lastID, username: username },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.status(201).json({
                        message: '注册成功',
                        token: token,
                        user: {
                            id: this.lastID,
                            username: username,
                            email: email
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户登录
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码都是必填项' });
        }

        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: '数据库错误' });
            }

            if (!user) {
                return res.status(400).json({ error: '用户不存在' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: '密码错误' });
            }

            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: '登录成功',
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取用户的待办事项
app.get('/api/todos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '获取待办事项失败' });
        }
        res.json({ todos: rows });
    });
});

// 创建新的待办事项
app.post('/api/todos', authenticateToken, (req, res) => {
    const { title, description } = req.body;

    if (!title) {
        return res.status(400).json({ error: '标题是必填项' });
    }

    db.run('INSERT INTO todos (user_id, title, description) VALUES (?, ?, ?)', 
        [req.user.userId, title, description || ''], 
        function(err) {
            if (err) {
                return res.status(500).json({ error: '创建待办事项失败' });
            }

            res.status(201).json({
                message: '待办事项创建成功',
                todo: {
                    id: this.lastID,
                    title: title,
                    description: description || '',
                    completed: false
                }
            });
        }
    );
});

// 更新待办事项
app.put('/api/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    db.run('UPDATE todos SET title = ?, description = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [title, description, completed ? 1 : 0, id, req.user.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: '更新待办事项失败' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: '待办事项不存在' });
            }

            res.json({ message: '待办事项更新成功' });
        }
    );
});

// 删除待办事项
app.delete('/api/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.userId], function(err) {
        if (err) {
            return res.status(500).json({ error: '删除待办事项失败' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: '待办事项不存在' });
        }

        res.json({ message: '待办事项删除成功' });
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
    console.log(`TodoApp 后端服务器运行在端口 ${PORT}`);
});

module.exports = app;