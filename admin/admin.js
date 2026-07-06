const firebaseConfig = {
  apiKey: "AIzaSyDAqUbYPX5wVpRn1Tgs4uquB_qhMAUz8q0",
  authDomain: "logic-gadget-store.firebaseapp.com",
  projectId: "logic-gadget-store",
  storageBucket: "logic-gadget-store.firebasestorage.app",
  messagingSenderId: "914698370044",
  appId: "1:914698370044:web:a5bc33e15a76094a68d079"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

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

const seedData = {
  iphones: [
    { id: 1, name: "iPhone XR", img: "images/iphonexr.jpg", storage: [{ gb: "64GB", price: 190000 }, { gb: "128GB", price: 220000 }] },
    { id: 2, name: "iPhone XS", img: "images/iphonexs.jpg", storage: [{ gb: "64GB", price: 190000 }, { gb: "128GB", price: 250000 }] },
    { id: 3, name: "iPhone XS Max", img: "images/iphonexsmax.jpg", storage: [{ gb: "64GB", price: 250000 }, { gb: "128GB", price: 280000 }, { gb: "256GB", price: 310000 }] },
    { id: 4, name: "iPhone 11", img: "images/iphone11.jpg", storage: [{ gb: "64GB", price: 250000 }, { gb: "128GB", price: 290000 }] },
    { id: 5, name: "iPhone 11 Pro", img: "images/iphone11pro.jpeg", storage: [{ gb: "64GB", price: 295000 }, { gb: "256GB", price: 350000 }] },
    { id: 6, name: "iPhone 11 Pro Max", img: "images/iphone11promax.jpg", storage: [{ gb: "64GB", price: 350000 }, { gb: "256GB", price: 380000 }] },
    { id: 7, name: "iPhone 12", img: "images/iphone12.jpg", storage: [{ gb: "64GB", price: 265000 }, { gb: "128GB", price: 330000 }] },
    { id: 8, name: "iPhone 12 Pro", img: "images/iphone12pro.jpg", storage: [{ gb: "128GB", price: 390000 }, { gb: "256GB", price: 410000 }] },
    { id: 9, name: "iPhone 12 Pro Max", img: "images/iphone12promax.jpg", storage: [{ gb: "128GB", price: 650000 }, { gb: "256GB", price: 720000 }] },
    { id: 10, name: "iPhone 13", img: "images/iphone13.jpg", storage: [{ gb: "128GB", price: 390000 }, { gb: "256GB", price: 450000 }] },
    { id: 11, name: "iPhone 13 Pro", img: "images/iphone13pro.jpg", storage: [{ gb: "128GB", price: 510000 }, { gb: "256GB", price: 550000 }] },
    { id: 12, name: "iPhone 13 Pro Max", img: "images/iphone13promax.jpg", storage: [{ gb: "128GB", price: 590000 }, { gb: "256GB", price: 630000 }] },
    { id: 13, name: "iPhone 14", img: "images/iphone14.jpg", storage: [{ gb: "128GB", price: 470000 }, { gb: "256GB", price: 530000 }] },
    { id: 14, name: "iPhone 14 Plus", img: "images/iphone14plus.jpg", storage: [{ gb: "128GB", price: 550000 }] },
    { id: 15, name: "iPhone 14 Pro", img: "images/iphone14pro.jpg", storage: [{ gb: "128GB", price: 650000 }, { gb: "256GB", price: 700000 }] },
    { id: 16, name: "iPhone 14 Pro Max", img: "images/iphone14promax.jpg", storage: [{ gb: "128GB", price: 750000 }, { gb: "256GB", price: 850000 }] },
    { id: 17, name: "iPhone 15", img: "images/iphone15.jpg", storage: [{ gb: "128GB", price: 650000 }, { gb: "256GB", price: 700000 }] },
    { id: 18, name: "iPhone 15 Pro", img: "images/iphone15pro.jpg", storage: [{ gb: "256GB", price: 800000 }, { gb: "512GB", price: 850000 }] },
    { id: 19, name: "iPhone 15 Pro Max", img: "images/iphone15promax.jpg", storage: [{ gb: "256GB", price: 890000 }, { gb: "512GB", price: 930000 }] },
    { id: 20, name: "iPhone 16", img: "images/iphone16.jpg", storage: [{ gb: "128GB", price: 900000 }, { gb: "256GB", price: 950000 }] },
    { id: 21, name: "iPhone 16 Plus", img: "images/iphone16plus.jpg", storage: [{ gb: "256GB", price: 950000 }, { gb: "512GB", price: 990000 }] },
    { id: 22, name: "iPhone 16 Pro", img: "images/iphone16pro.jpg", storage: [{ gb: "256GB", price: 1300000 }, { gb: "512GB", price: 1700000 }] },
    { id: 23, name: "iPhone 16 Pro Max", img: "images/iphone16promax.jpg", storage: [{ gb: "256GB", price: 1500000 }, { gb: "512GB", price: 1900000 }] },
    { id: 24, name: "iPhone 17", img: "images/iphone17.jpg", storage: [{ gb: "256GB", price: 2000000 }, { gb: "512GB", price: 2100000 }] },
    { id: 25, name: "iPhone 17 Air", img: "images/iphone17air.jpg", storage: [{ gb: "256GB", price: 2000000 }, { gb: "512GB", price: 2200000 }] },
    { id: 26, name: "iPhone 17 Pro", img: "images/iphone17pro.jpg", storage: [{ gb: "256GB", price: 2100000 }, { gb: "512GB", price: 2300000 }] },
    { id: 27, name: "iPhone 17 Pro Max", img: "images/iphone17promax.jpg", storage: [{ gb: "512GB", price: 2500000 }, { gb: "1TB", price: 2700000 }] }
  ],
  cases: [
    { id: 101, name: "iPhone Case", price: 2000, img: "images/case1.jpg" },
    { id: 102, name: "iPhone Case", price: 2000, img: "images/case2.jpg" },
    { id: 103, name: "iPhone Case", price: 2000, img: "images/case3.jpg" },
    { id: 104, name: "iPhone Case", price: 2000, img: "images/case4.jpg" },
    { id: 105, name: "iPhone Case", price: 2000, img: "images/case5.jpg" },
    { id: 106, name: "iPhone Case", price: 2000, img: "images/case6.jpg" },
    { id: 107, name: "Silicone double side Suction", price: 2000, img: "images/case7.jpg" },
    { id: 108, name: "iPhone Case", price: 2000, img: "images/case11.jpg" },
    { id: 109, name: "iPhone Case", price: 2000, img: "images/case12.jpg" },
    { id: 110, name: "iPhone Case", price: 2000, img: "images/case13.jpg" },
    { id: 111, name: "Case", price: 2000, img: "images/case14.jpg" },
    { id: 112, name: "Luxury Case", price: 5000, img: "images/case15.jpg" }
  ],
  accessories: [
    { id: 201, name: "JBL Speaker", price: 780000, img: "images/acc1.jpg" },
    { id: 202, name: "ONYX Speaker", price: 780000, img: "images/acc2.jpg" },
    { id: 203, name: "Tripod Stand", price: 18000, img: "images/acc3.jpg" },
    { id: 204, name: "OSMO POCKET 3", price: 950000, img: "images/acc4.jpg" },
    { id: 205, name: "Tripod Stand", price: 22000, img: "images/acc5.jpg" },
    { id: 206, name: "Wireless Controller Manual", price: 650000, img: "images/acc6.jpg" },
    { id: 207, name: "ZEALOT-P12", price: 65000, img: "images/acc7.jpg" },
    { id: 208, name: "ZEALOT-P8", price: 45000, img: "images/acc8.jpg" },
    { id: 209, name: "ZEALOT S-67", price: 60000, img: "images/acc9.jpg" },
    { id: 210, name: "ZEALOT S78", price: 65000, img: "images/acc10.jpg" },
    { id: 211, name: "ZEALOT S79", price: 65000, img: "images/acc11.jpg" },
    { id: 212, name: "ZEALOT SUPER BASS", price: 65000, img: "images/acc12.jpg" },
    { id: 213, name: "ZEALOT S97", price: 85000, img: "images/acc13.jpg" },
    { id: 214, name: "PS", price: 30000, img: "images/acc14.jpg" },
    { id: 215, name: "GAMING SET", price: 1000000, img: "images/acc15.jpg" },
    { id: 216, name: "PS5", price: 1000000, img: "images/acc16.jpg" },
    { id: 217, name: "MICROPHONE", price: 10000, img: "images/acc17.jpg" },
    { id: 218, name: "EARBUD", price: 10000, img: "images/acc18.jpg" },
    { id: 219, name: "Oraimo Earbuds", price: 9000, img: "images/acc19.jpg" }
  ],
  powerbanks: [
    { id: 301, name: "Oraimo Power Bank", img: "images/oraimo.jpg", storage: [{ gb: "20000mAh", price: 18000 }, { gb: "30000mAh", price: 25000 }, { gb: "40000mAh", price: 35000 }, { gb: "55000mAh", price: 50000 }] },
    { id: 302, name: "Itel Power Bank", img: "images/itel.jpg", storage: [{ gb: "20000mAh", price: 18000 }, { gb: "27000mAh", price: 25000 }, { gb: "30000mAh", price: 27000 }, { gb: "60000mAh", price: 75000 }] },
    { id: 303, name: "New Age Power Bank", img: "images/newage.jpg", storage: [{ gb: "22500mAh", price: 16000 }, { gb: "34000mAh", price: 24000 }, { gb: "55000mAh", price: 57000 }, { gb: "66000mAh", price: 60000 }] },
    { id: 304, name: "Linco Power Bank", img: "images/linco.jpg", storage: [{ gb: "20000mAh", price: 13000 }, { gb: "30000mAh", price: 15000 }, { gb: "50000mAh", price: 35000 }, { gb: "60000mAh", price: 48000 }] },
    { id: 305, name: "Wireless Power Bank", img: "images/pb5.jpg", storage: [{ gb: "10000mAh", price: 15000 }, { gb: "20000mAh", price: 25000 }] },
    { id: 306, name: "Itel Power Tank", img: "images/pb6.jpg", storage: [{ gb: "500Wh", price: 250000 }, { gb: "1000Wh", price: 450000 }] }
  ]
};

async function seedProducts() {
  const btn = document.querySelector("#seedSection button");
  const status = document.getElementById("seedStatus");
  btn.disabled = true;
  status.textContent = "Importing...";

  const batch = db.batch();
  let count = 0;

  for (const [category, products] of Object.entries(seedData)) {
    for (const product of products) {
      batch.set(db.collection("products").doc(), { ...product, category });
      count++;
    }
  }

  await batch.commit();
  status.textContent = `${count} products imported successfully!`;
  setTimeout(() => {
    document.getElementById("seedSection").style.display = "none";
    loadProducts();
  }, 1500);
}


