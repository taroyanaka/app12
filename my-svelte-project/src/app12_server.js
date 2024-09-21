// テーブル設計
// users テーブル
// uid (TEXT, PRIMARY KEY)
// name (TEXT, NOT NULL)
// tasks テーブル
// id (INTEGER, PRIMARY KEY, AUTOINCREMENT)
// name (TEXT, NOT NULL)
// start (TEXT, NOT NULL)
// end (TEXT, NOT NULL)
// progress (INTEGER, NOT NULL)
// uid (TEXT, NOT NULL, FOREIGN KEY REFERENCES users(uid))

const express = require('express');
const sqlite = require('better-sqlite3');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const port = 8000;
app.listen(port, "0.0.0.0", () => {
    console.log(`App listening at http://localhost:${port}`);
});

const db = new sqlite('app12.db');

const hashUid = (uid) => crypto.createHash('sha256').update(uid).digest('hex');

function validateTaskForm(taskForm) {
    if (!taskForm.name) {
        return 'タスク名を入力してください。';
    }
    if (new Date(taskForm.start) >= new Date(taskForm.end)) {
        return '開始日は終了日より前でなければなりません。';
    }
    if (taskForm.progress < 0 || taskForm.progress > 100) {
        return '進捗は0から100の間でなければなりません。';
    }
    return '';
}

// テーブル初期化エンドポイント
app.post('/init', (req, res) => {
    console.log(req.body);
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                start TEXT NOT NULL,
                end TEXT NOT NULL,
                progress INTEGER NOT NULL,
                uid TEXT NOT NULL,
                FOREIGN KEY (uid) REFERENCES users(uid)
            );
        `);
        res.status(200).json({ message: 'Tables initialized' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error initializing tables' });
    }
});

// サンプルタスク挿入エンドポイント
app.post('/app12_insert_sample', (req, res) => {
    console.log(req.body);
    try {
        const { uid, name, start, end, progress } = req.body;
        if (!uid || !name || !start || !end || progress === undefined) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }
        const validationError = validateTaskForm({ name, start, end, progress });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const hashedUid = hashUid(uid);
        const userStmt = db.prepare('INSERT OR IGNORE INTO users (uid, name) VALUES (?, ?)');
        userStmt.run(hashedUid, 'Sample User');
        const taskStmt = db.prepare('INSERT INTO tasks (name, start, end, progress, uid) VALUES (?, ?, ?, ?, ?)');
        taskStmt.run(name, start, end, progress, hashedUid);
        res.status(200).json({ message: 'Sample task inserted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error inserting sample task' });
    }
});

// 全タスク取得エンドポイント
app.get('/app12_tasks', (req, res) => {
    console.log(req.query);
    try {
        const tasks = db.prepare('SELECT * FROM tasks').all();
        res.status(200).json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});


// 削除と更新のエンドポイント(uidの確認必須)
app.post('/app12_task_update', (req, res) => {
    console.log(req.body);
    try {
        const { id, name, start, end, progress, uid } = req.body;
        if (id === undefined || !name || !start || !end || progress === undefined || !uid) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }
        const validationError = validateTaskForm({ name, start, end, progress });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const hashedUid = hashUid(uid);
        const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(hashedUid);
        if (!user) {
            return res.status(400).json({ error: 'Invalid uid' });
        }
        const taskStmt = db.prepare('UPDATE tasks SET name = ?, start = ?, end = ?, progress = ? WHERE id = ?');
        taskStmt.run(name, start, end, progress, id);
        res.status(200).json({ message: 'Task updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating task' });
    }
}
);

// 削除エンドポイント
app.post('/app12_task_delete', (req, res) => {
    console.log(req.body);
    try {
        const { id, uid } = req.body;
        if (id === undefined || !uid) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }
        const hashedUid = hashUid(uid);
        const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(hashedUid);
        if (!user) {
            return res.status(400).json({ error: 'Invalid uid' });
        }
        const taskStmt = db.prepare('DELETE FROM tasks WHERE id = ?');
        taskStmt.run(id);
        res.status(200).json({ message: 'Task deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting task' });
    }
});