import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("hoc.db");
const JWT_SECRET = process.env.JWT_SECRET || "hoc-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS hazards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT,
    location TEXT,
    riskLevel TEXT,
    description TEXT,
    imageUrl TEXT,
    status TEXT DEFAULT 'open',
    remarks TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // WebSocket handling
  const clients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    next();
  };

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json(req.user);
  });

  // Hazard Routes
  app.post("/api/hazards", authenticate, (req: any, res) => {
    const { type, location, riskLevel, description, imageUrl } = req.body;
    const result = db.prepare(`
      INSERT INTO hazards (userId, type, location, riskLevel, description, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type, location, riskLevel, description, imageUrl);
    
    const newHazard = db.prepare("SELECT * FROM hazards WHERE id = ?").get(result.lastInsertRowid);
    broadcast({ type: 'NEW_HAZARD', payload: newHazard });
    res.json(newHazard);
  });

  app.get("/api/hazards", authenticate, (req: any, res) => {
    let hazards;
    if (req.user.role === 'admin') {
      hazards = db.prepare(`
        SELECT h.*, u.username as reporter 
        FROM hazards h 
        JOIN users u ON h.userId = u.id 
        ORDER BY h.createdAt DESC
      `).all();
    } else {
      hazards = db.prepare("SELECT * FROM hazards WHERE userId = ? ORDER BY createdAt DESC").all(req.user.id);
    }
    res.json(hazards);
  });

  app.patch("/api/hazards/:id", authenticate, isAdmin, (req: any, res) => {
    const { status, remarks } = req.body;
    db.prepare("UPDATE hazards SET status = ?, remarks = ? WHERE id = ?").run(status, remarks, req.params.id);
    const updated = db.prepare("SELECT * FROM hazards WHERE id = ?").get(req.params.id);
    broadcast({ type: 'STATUS_UPDATE', payload: updated });
    res.json(updated);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
