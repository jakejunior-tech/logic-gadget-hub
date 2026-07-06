require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DATA_FILE = path.join(__dirname, "data", "products.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/admin", express.static(path.join(__dirname, "admin")));

function readProducts() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeProducts(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token || token !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_PASSWORD });
  }
  res.status(401).json({ error: "Invalid password" });
});

app.get("/api/products", (req, res) => {
  const data = readProducts();
  res.json(data);
});

app.get("/api/products/:category", (req, res) => {
  const data = readProducts();
  const { category } = req.params;
  if (!data[category]) return res.status(404).json({ error: "Category not found" });
  res.json(data[category]);
});

app.post("/api/products/:category", requireAuth, (req, res) => {
  const data = readProducts();
  const { category } = req.params;
  if (!data[category]) return res.status(404).json({ error: "Category not found" });

  const product = req.body;
  product.id = Date.now();
  data[category].push(product);
  writeProducts(data);
  res.json(product);
});

app.put("/api/products/:category/:id", requireAuth, (req, res) => {
  const data = readProducts();
  const { category, id } = req.params;
  if (!data[category]) return res.status(404).json({ error: "Category not found" });

  const index = data[category].findIndex((p) => p.id === parseInt(id));
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  data[category][index] = { ...data[category][index], ...req.body, id: parseInt(id) };
  writeProducts(data);
  res.json(data[category][index]);
});

app.delete("/api/products/:category/:id", requireAuth, (req, res) => {
  const data = readProducts();
  const { category, id } = req.params;
  if (!data[category]) return res.status(404).json({ error: "Category not found" });

  data[category] = data[category].filter((p) => p.id !== parseInt(id));
  writeProducts(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Store: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});
