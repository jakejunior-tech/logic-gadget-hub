let currentCategory = "iphones";
let allProducts = {};

function getToken() {
  return localStorage.getItem("adminToken");
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function login() {
  const password = document.getElementById("loginPassword").value;
  const res = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  if (res && res.token) {
    localStorage.setItem("adminToken", res.token);
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadProducts();
  } else {
    document.getElementById("loginError").textContent = "Wrong password";
  }
}

function logout() {
  localStorage.removeItem("adminToken");
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
}

async function loadProducts() {
  allProducts = await api("/api/products");
  renderProducts();
}

function renderProducts() {
  const container = document.getElementById("productsContainer");
  const search = (document.getElementById("adminSearch").value || "").toLowerCase();
  const products = allProducts[currentCategory] || [];
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search));

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--muted);text-align:center;padding:40px;">No products found</p>`;
    return;
  }

  container.innerHTML = `<div class="products-list">${filtered.map((p) => `
    <div class="admin-product">
      <img src="${p.img}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect fill=%22%231f2937%22 width=%2260%22 height=%2260%22/></svg>'">
      <div class="info">
        <h4>${p.name}</h4>
        <p>${p.storage ? p.storage.map(s => s.gb + ' - ₦' + s.price.toLocaleString()).join(', ') : '₦' + p.price.toLocaleString()}</p>
      </div>
      <div class="actions">
        <button class="edit-btn" onclick="openEditModal('${currentCategory}', ${p.id})"><i class="fas fa-edit"></i> Edit</button>
        <button class="delete-btn" onclick="deleteProduct('${currentCategory}', ${p.id})"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>
  `).join("")}</div>`;
}

function switchTab(category) {
  currentCategory = category;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelector(`.tab[data-cat="${category}"]`).classList.add("active");
  renderProducts();
}

function addStorageRow(gb = "", price = "") {
  const container = document.getElementById("storageContainer");
  const row = document.createElement("div");
  row.className = "storage-row";
  row.innerHTML = `
    <input type="text" class="storage-gb" placeholder="e.g. 128GB" value="${gb}">
    <input type="number" class="storage-price" placeholder="Price" value="${price}">
    <button class="remove-storage" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(row);
}

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Product";
  document.getElementById("editId").value = "";
  document.getElementById("editCategory").value = currentCategory;
  document.getElementById("productName").value = "";
  document.getElementById("productImg").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("storageContainer").innerHTML = `
    <div class="storage-row">
      <input type="text" class="storage-gb" placeholder="e.g. 128GB">
      <input type="number" class="storage-price" placeholder="Price">
      <button class="remove-storage" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    </div>
  `;
  document.getElementById("productModal").style.display = "flex";
}

function openEditModal(category, id) {
  const product = allProducts[category].find((p) => p.id === id);
  if (!product) return;

  document.getElementById("modalTitle").textContent = "Edit Product";
  document.getElementById("editId").value = id;
  document.getElementById("editCategory").value = category;
  document.getElementById("productName").value = product.name;
  document.getElementById("productImg").value = product.img;
  document.getElementById("productPrice").value = product.price || "";

  const sc = document.getElementById("storageContainer");
  sc.innerHTML = "";
  if (product.storage && product.storage.length > 0) {
    product.storage.forEach((s) => addStorageRow(s.gb, s.price));
  } else {
    addStorageRow();
  }

  document.getElementById("productModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("productModal").style.display = "none";
}

async function saveProduct() {
  const id = document.getElementById("editId").value;
  const category = document.getElementById("editCategory").value || currentCategory;
  const name = document.getElementById("productName").value.trim();
  const img = document.getElementById("productImg").value.trim();
  const price = document.getElementById("productPrice").value;

  if (!name || !img) {
    alert("Product name and image are required");
    return;
  }

  const storageRows = document.querySelectorAll(".storage-row");
  const storage = [];
  let hasStorage = false;

  storageRows.forEach((row) => {
    const gb = row.querySelector(".storage-gb").value.trim();
    const p = row.querySelector(".storage-price").value;
    if (gb && p) {
      storage.push({ gb, price: parseInt(p) });
      hasStorage = true;
    }
  });

  const body = { name, img };
  if (hasStorage) {
    body.storage = storage;
  } else if (price) {
    body.price = parseInt(price);
  }

  if (id) {
    await api(`/api/products/${category}/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } else {
    await api(`/api/products/${category}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  closeModal();
  loadProducts();
}

async function deleteProduct(category, id) {
  if (!confirm("Delete this product?")) return;
  await api(`/api/products/${category}/${id}`, { method: "DELETE" });
  loadProducts();
}

document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (token) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadProducts();
  }
});
