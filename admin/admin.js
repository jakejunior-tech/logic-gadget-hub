let currentCategory = "iphones";
let allProducts = {};

auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadProducts();
  } else {
    document.getElementById("loginPage").style.display = "flex";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("seedSection").style.display = "none";
  }
});

async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById("loginError").textContent = "";
  } catch (e) {
    document.getElementById("loginError").textContent = e.message;
  }
}

function logout() {
  auth.signOut();
}

async function loadProducts() {
  try {
    const snapshot = await db.collection("products").get();
    allProducts = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      const cat = data.category;
      if (!allProducts[cat]) allProducts[cat] = [];
      data._docId = doc.id;
      allProducts[cat].push(data);
    });
    renderProducts();
    if (snapshot.empty) {
      document.getElementById("seedSection").style.display = "block";
    }
  } catch (e) {
    console.error(e);
  }
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
        <button class="edit-btn" onclick="openEditModal('${p._docId}')"><i class="fas fa-edit"></i> Edit</button>
        <button class="delete-btn" onclick="deleteProduct('${p._docId}')"><i class="fas fa-trash"></i> Delete</button>
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
  document.getElementById("editDocId").value = "";
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

function openEditModal(docId) {
  let product;
  for (const cat of Object.values(allProducts)) {
    const found = cat.find((p) => p._docId === docId);
    if (found) { product = found; break; }
  }
  if (!product) return;

  document.getElementById("modalTitle").textContent = "Edit Product";
  document.getElementById("editDocId").value = docId;
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
  const docId = document.getElementById("editDocId").value;
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

  if (docId) {
    const updates = { name, img };
    if (hasStorage) {
      updates.storage = storage;
      updates.price = firebase.firestore.FieldValue.delete();
    } else if (price) {
      updates.price = parseInt(price);
      updates.storage = firebase.firestore.FieldValue.delete();
    }
    await db.collection("products").doc(docId).update(updates);
  } else {
    const maxId = (allProducts[currentCategory] || []).reduce((max, p) => Math.max(max, p.id || 0), 0);
    const body = { id: maxId + 1, name, img, category: currentCategory };
    if (hasStorage) {
      body.storage = storage;
    } else if (price) {
      body.price = parseInt(price);
    }
    await db.collection("products").add(body);
  }

  closeModal();
  loadProducts();
}

async function deleteProduct(docId) {
  if (!confirm("Delete this product?")) return;
  await db.collection("products").doc(docId).delete();
  loadProducts();
}


