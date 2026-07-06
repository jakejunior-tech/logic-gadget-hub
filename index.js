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

const whatsappNumber = "YOUR_WHATSAPP_NUMBER";

let storeProducts = {};

function displayProducts(category, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  (storeProducts[category] || []).forEach((product) => {
    let storageHTML = "";
    if (product.storage) {
      storageHTML = `<select id="storage-${product.id}" class="storage-select">${product.storage.map((item, index) => `<option value="${index}">${item.gb} - ₦${item.price.toLocaleString()}</option>`).join("")}</select>`;
    }

    const displayPrice = product.price || product.storage[0].price;

    container.innerHTML += `
      <div class="product-card reveal">
        <img src="${product.img}" alt="${product.name}" onclick="openImage('${product.img}')" onerror="this.src='images/placeholder.svg'">
        <div class="product-info">
          <h3>${product.name}</h3>
          ${storageHTML}
          <p class="price">₦${displayPrice.toLocaleString()}</p>
          <button onclick="order(${product.id},'${category}')">Order on WhatsApp</button>
        </div>
      </div>`;
  });

  revealSections();
}

function order(id, category) {
  const product = (storeProducts[category] || []).find((item) => item.id === id);
  if (!product) return;

  let productName = product.name;
  let productPrice = product.price;

  if (product.storage) {
    const select = document.getElementById(`storage-${product.id}`);
    const chosen = product.storage[select.value];
    productName = `${product.name} (${chosen.gb})`;
    productPrice = chosen.price;
  }

  const message = `Hello, I want to order:\n\n${productName}\nPrice: ₦${productPrice.toLocaleString()}\n\nPlease send payment details.`;
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
}

function searchProducts(value) {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.style.display = card.innerText.toLowerCase().includes(value.toLowerCase()) ? "block" : "none";
  });
}

function filterCategory(category) {
  const sections = document.querySelectorAll(".products");
  if (category === "all") {
    sections.forEach((s) => s.style.display = "block");
    return;
  }
  sections.forEach((s) => s.style.display = "none");
  const selected = document.getElementById(category);
  if (selected) selected.style.display = "block";
}

function openImage(src) {
  document.getElementById("modalImage").src = src;
  document.getElementById("imageModal").classList.add("active");
}

function closeImage() {
  document.getElementById("imageModal").classList.remove("active");
}

function toggleMenu() {
  document.getElementById("navbar").classList.toggle("active");
  document.getElementById("menuToggle").classList.toggle("active");
}

document.addEventListener("click", (e) => {
  const nav = document.getElementById("navbar");
  const toggle = document.getElementById("menuToggle");
  if (nav.classList.contains("active") && !nav.contains(e.target) && !toggle.contains(e.target)) {
    nav.classList.remove("active");
    toggle.classList.remove("active");
  }
});

function revealSections() {
  const reveals = document.querySelectorAll(".reveal");
  reveals.forEach((item) => {
    if (item.getBoundingClientRect().top < window.innerHeight - 120) {
      item.classList.add("active");
    }
  });
}

async function loadStoreProducts() {
  try {
    const snapshot = await db.collection("products").get();
    const products = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      const cat = data.category;
      if (!products[cat]) products[cat] = [];
      products[cat].push(data);
    });
    storeProducts = products;
  } catch {
    storeProducts = {};
  }
  displayProducts("iphones", "iphonesGrid");
  displayProducts("cases", "casesGrid");
  displayProducts("accessories", "accessoriesGrid");
  displayProducts("powerbanks", "powerbanksGrid");
}

document.addEventListener("DOMContentLoaded", () => {
  loadStoreProducts();

  const shopBtn = document.getElementById("shopNowBtn");
  if (shopBtn) {
    shopBtn.addEventListener("click", () => {
      document.getElementById("iphones").scrollIntoView({ behavior: "smooth" });
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => searchProducts(e.target.value));
  }

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", (e) => filterCategory(e.target.value));
  }

  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) menuToggle.addEventListener("click", toggleMenu);

  const closeBtn = document.getElementById("closeImageModal");
  if (closeBtn) closeBtn.addEventListener("click", closeImage);

  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "imageModal") closeImage();
    });
  }

  const topBtn = document.getElementById("topBtn");
  if (topBtn) {
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  revealSections();
});

window.addEventListener("scroll", () => {
  revealSections();
  const topBtn = document.getElementById("topBtn");
  if (topBtn) {
    topBtn.style.display = window.scrollY > 400 ? "block" : "none";
  }
});

window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  preloader.style.opacity = "0";
  setTimeout(() => { preloader.style.display = "none"; }, 800);
});
