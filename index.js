const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'todoapp_secret_key_2024';

// Supabase配置
const supabaseUrl = 'https://mgyugmeceypobpjmmvxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1neXVnbWVjZXlwb2Jwam1tdnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNDUwMjgsImV4cCI6MjA2OTYyMTAyOH0.hmfdCwR6RQepaJWa9tGl2A00S5aV8B8YB9OPL3DrdXs';
const supabase = createClient(supabaseUrl, supabaseKey);

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
        message: 'TodoApp 后端API服务器运行中 (Supabase版本)',
        version: '2.0.0',
        database: 'Supabase PostgreSQL',
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
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${email}`)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: '用户名或邮箱已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用户
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                { username, email, password: hashedPassword }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('注册错误:', insertError);
            return res.status(500).json({ error: '注册失败' });
        }

        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: '注册成功',
            token: token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('注册服务器错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码都是必填项' });
        }

        // 查找用户
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .single();

        if (findError || !user) {
            return res.status(400).json({ error: '用户不存在' });
        }

        // 验证密码
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
    } catch (error) {
        console.error('登录服务器错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取用户的待办事项
app.get('/api/todos', authenticateToken, async (req, res) => {
    try {
        const { data: todos, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('获取待办事项错误:', error);
            return res.status(500).json({ error: '获取待办事项失败' });
        }

        res.json({ todos: todos || [] });
    } catch (error) {
        console.error('获取待办事项服务器错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建新的待办事项
app.post('/api/todos', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({ error: '标题是必填项' });
        }

        const { data: newTodo, error } = await supabase
            .from('todos')
            .insert([
                { 
                    user_id: req.user.userId, 
                    title, 
                    description: description || '',
                    completed: false
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('创建待办事项错误:', error);
            return res.status(500).json({ error: '创建待办事项失败' });
        }

        res.status(201).json({
            message: '待办事项创建成功',
            todo: newTodo
        });
    } catch (error) {
        console.error('创建待办事项服务器错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新待办事项
app.put('/api/todos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, completed } = req.body;

        const { data: updatedTodo, error } = await supabase
            .from('todos')
            .update({ 
                title, 
                description, 
                completed,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .select()
            .single();

        if (error || !updatedTodo) {
            console.error('更新待办事项错误:', error);
            return res.status(404).json({ error: '待办事项不存在或更新失败' });
        }

        res.json({ 
            message: '待办事项更新成功',
            todo: updatedTodo
        });
    } catch (error) {
        console.error('更新待办事项服务器错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除待办事项
app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.userId);

        if (error) {
            console.error('删除待办事项错误:', error);
            return res.status(500).json({ error: '删除待办事项失败' });
        }

        res.json({ message: '待办事项删除成功' });
    } catch (error) {
        console.error('删除待办事项服务器错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
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
    console.log(`TodoApp 后端服务器运行在端口 ${PORT} (Supabase版本)`);
});

module.exports = app;