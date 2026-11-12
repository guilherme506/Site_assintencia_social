const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "conecta-estudante.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    summary TEXT NOT NULL,
    answer TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS confessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT NOT NULL,
    anonymous INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Geral',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS forum_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_confessions_user ON confessions(user_id);
`);

const faqCount = db.prepare("SELECT COUNT(*) AS total FROM faqs").get().total;
if (faqCount === 0) {
  const insertFaq = db.prepare(`
    INSERT INTO faqs (category, question, summary, answer, position)
    VALUES (@category, @question, @summary, @answer, @position)
  `);
  const initialFaqs = [
    {
      category: "ORGANIZAÇÃO",
      question: "Como posso organizar minha rotina de estudos?",
      summary: "Veja como distribuir suas tarefas e criar um planejamento possível de seguir.",
      answer: "Comece anotando suas aulas, compromissos e prazos. Depois, escolha pequenos períodos de estudo que caibam na sua rotina, defina prioridades e reserve pausas. Um planejamento realista costuma funcionar melhor do que uma agenda muito cheia.",
      position: 1
    },
    {
      category: "CONCENTRAÇÃO",
      question: "O que fazer quando tenho dificuldade de concentração?",
      summary: "Conheça pequenas estratégias para reduzir distrações durante os estudos.",
      answer: "Tente estudar em um local confortável, deixe o celular longe por alguns minutos e escolha uma tarefa específica para começar. Você também pode experimentar ciclos curtos de foco com pequenas pausas. Se a dificuldade persistir e atrapalhar seu dia a dia, procure apoio de alguém de confiança ou de um profissional.",
      position: 2
    },
    {
      category: "MOTIVAÇÃO",
      question: "Como evitar a procrastinação?",
      summary: "Comece com passos pequenos e descubra maneiras de sair do adiamento.",
      answer: "Divida tarefas grandes em etapas pequenas. Em vez de pensar que precisa estudar tudo, escolha um primeiro passo de 10 ou 15 minutos. Marcar o que foi concluído ajuda a visualizar seu progresso. Evite se culpar: recomeçar também faz parte.",
      position: 3
    },
    {
      category: "APRENDIZAGEM",
      question: "Como estudar para uma prova difícil?",
      summary: "Organize os conteúdos, revise aos poucos e pratique com exercícios.",
      answer: "Identifique os assuntos que serão cobrados, organize-os por prioridade e distribua a revisão ao longo dos dias. Faça exercícios, tente explicar o conteúdo com suas próprias palavras e anote as dúvidas para resolver antes da prova.",
      position: 4
    },
    {
      category: "EQUILÍBRIO",
      question: "Como conciliar trabalho, estudos e vida pessoal?",
      summary: "Aprenda a priorizar compromissos e reservar momentos de descanso.",
      answer: "Liste seus compromissos fixos e planeje o estudo nos horários realmente disponíveis. Defina prioridades para cada semana e preserve momentos de descanso. Nem todos os dias terão o mesmo ritmo, e ajustar o planejamento não significa fracassar.",
      position: 5
    },
    {
      category: "BEM-ESTAR",
      question: "O que fazer quando estou desmotivado?",
      summary: "Relembre seus objetivos e procure apoio quando sentir que precisa.",
      answer: "Procure lembrar por que começou e escolha uma meta pequena para hoje. Conversar com alguém de confiança pode ajudar a aliviar a sensação de estar sozinho. Se a desmotivação ou o sofrimento estiverem intensos ou persistentes, vale buscar apoio especializado.",
      position: 6
    }
  ];
  const seed = db.transaction(items => items.forEach(item => insertFaq.run(item)));
  seed(initialFaqs);
}

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(session({
  name: "conecta.sid",
  secret: process.env.SESSION_SECRET || "chave-local-de-desenvolvimento-altere-antes-de-publicar",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 4
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Faça login para realizar esta ação." });
  }
  next();
}
function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

app.get("/api/faqs", (req, res) => {
  const faqs = db.prepare(`
    SELECT id, category, question, summary, answer
    FROM faqs WHERE active = 1 ORDER BY position, id
  `).all();
  res.json(faqs);
});

app.post("/api/auth/register", (req, res) => {
  const name = cleanText(req.body.name, 80);
  const email = cleanText(req.body.email, 160).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return res.status(400).json({ error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres." });
  }
  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hash);
    req.session.user = { id: result.lastInsertRowid, name, email };
    res.status(201).json({ user: req.session.user });
  } catch (error) {
    if (String(error.code).startsWith("SQLITE_CONSTRAINT")) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }
    console.error(error);
    res.status(500).json({ error: "Não foi possível criar a conta." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = cleanText(req.body.email, 160).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const user = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("conecta.sid");
    res.json({ message: "Sessão encerrada." });
  });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// Desabafos não são listados publicamente. Cada estudante autenticado consulta apenas os próprios.
app.post("/api/confessions", requireAuth, (req, res) => {
  const content = cleanText(req.body.content, 5000);
  const anonymous = req.body.anonymous === false ? 0 : 1;
  if (content.length < 5) return res.status(400).json({ error: "Escreva pelo menos 5 caracteres." });
  const result = db.prepare("INSERT INTO confessions (user_id, content, anonymous) VALUES (?, ?, ?)")
    .run(req.session.user.id, content, anonymous);
  res.status(201).json({ id: result.lastInsertRowid, message: "Desabafo salvo com privacidade." });
});

app.get("/api/confessions/mine", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, content, anonymous, created_at
    FROM confessions WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.session.user.id);
  res.json(rows);
});

app.post("/api/forum/posts", requireAuth, (req, res) => {
  const title = cleanText(req.body.title, 120);
  const content = cleanText(req.body.content, 5000);
  const category = cleanText(req.body.category || "Geral", 50) || "Geral";
  if (title.length < 5 || content.length < 10) {
    return res.status(400).json({ error: "O título precisa ter 5 caracteres e o texto 10 caracteres, no mínimo." });
  }
  const result = db.prepare("INSERT INTO forum_posts (user_id, title, content, category) VALUES (?, ?, ?, ?)")
    .run(req.session.user.id, title, content, category);
  res.status(201).json({ id: result.lastInsertRowid, message: "Publicação criada." });
});

app.get("/api/forum/posts", (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.title, p.content, p.category, p.created_at, u.name AS author,
      (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) AS comment_count
    FROM forum_posts p JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC LIMIT 100
  `).all();
  res.json(rows);
});

app.post("/api/forum/posts/:id/comments", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const content = cleanText(req.body.content, 3000);
  if (!Number.isInteger(postId) || postId < 1 || content.length < 2) {
    return res.status(400).json({ error: "Informe uma publicação válida e um comentário." });
  }
  const post = db.prepare("SELECT id FROM forum_posts WHERE id = ?").get(postId);
  if (!post) return res.status(404).json({ error: "Publicação não encontrada." });
  const result = db.prepare("INSERT INTO forum_comments (post_id, user_id, content) VALUES (?, ?, ?)")
    .run(postId, req.session.user.id, content);
  res.status(201).json({ id: result.lastInsertRowid, message: "Comentário adicionado." });
});

app.get("/api/forum/posts/:id/comments", (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId < 1) return res.status(400).json({ error: "Identificador inválido." });
  const rows = db.prepare(`
    SELECT c.id, c.content, c.created_at, u.name AS author
    FROM forum_comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(postId);
  res.json(rows);
});

app.use(express.static(path.join(__dirname)));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Rota não encontrada." });
  res.status(404).send("Página não encontrada.");
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Conecta Estudante disponível em http://localhost:${PORT}`);
  console.log("Banco SQLite: data/conecta-estudante.sqlite");
});
