const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data'); // фиксированная папка с JSON

// Получить список JSON-файлов и их содержимое
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const result = {};
    files.forEach(name => {
      const content = fs.readFileSync(path.join(DATA_DIR, name), 'utf-8');
      try {
        JSON.parse(content); // проверка валидности
        result[name] = content;
      } catch {
        result[name] = content; // даже битый JSON отдаём как есть
      }
    });
    res.json({ files: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Сохранить файл
app.put('/api/files/:name', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Нет содержимого' });
    // Валидация JSON
    JSON.parse(content);
    fs.writeFileSync(path.join(DATA_DIR, req.params.name), content, 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Создать новый файл
app.post('/api/files', (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name) return res.status(400).json({ error: 'Нет имени файла' });
    const safeName = name.endsWith('.json') ? name : `${name}.json`;
    const initialContent = content || '[]';
    JSON.parse(initialContent); // валидация
    fs.writeFileSync(path.join(DATA_DIR, safeName), initialContent, 'utf-8');
    res.json({ ok: true, name: safeName });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Удалить файл
app.delete('/api/files/:name', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, req.params.name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`JSON-сервер запущен на http://localhost:${PORT}`);
  console.log(`Папка с данными: ${DATA_DIR}`);
});