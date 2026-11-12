const API_BASE = "/api";
let questions = [];
let page = 0;
let toastTimer;

const track = document.getElementById("faqTrack");
const dotsContainer = document.getElementById("carouselDots");
const modal = document.getElementById("answerModal");
const toast = document.getElementById("toast");

function cardsPerPage() {
  if (window.innerWidth <= 620) return 1;
  if (window.innerWidth <= 850) return 2;
  return 3;
}
function pageCount() { return Math.max(1, Math.ceil(questions.length / cardsPerPage())); }

function iconClass(index) {
  return ["blue-soft", "lilac-soft", "pink-soft", "yellow-soft", "teal-soft"][index % 5];
}
function iconSymbol(index) { return ["▦", "◉", "♡", "✎", "◷"][index % 5]; }

function renderQuestions() {
  track.innerHTML = "";
  if (!questions.length) {
    track.innerHTML = '<p class="loading-message">Nenhuma pergunta frequente foi cadastrada.</p>';
    dotsContainer.innerHTML = "";
    return;
  }
  questions.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "faq-card";
    const icon = document.createElement("div");
    icon.className = `card-icon ${iconClass(index)}`;
    icon.textContent = iconSymbol(index);
    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = item.category || "DÚVIDA";
    const title = document.createElement("h3");
    title.textContent = item.question;
    const description = document.createElement("p");
    description.textContent = item.summary || "Veja a resposta para esta dúvida.";
    const link = document.createElement("button");
    link.className = "answer-link";
    link.type = "button";
    link.innerHTML = 'Ver resposta <span>→</span>';
    link.addEventListener("click", () => openAnswer(item));
    card.append(icon, category, title, description, link);
    track.append(card);
  });
  renderDots();
  updateCarousel();
}

function renderDots() {
  dotsContainer.innerHTML = "";
  for (let i = 0; i < pageCount(); i++) {
    const dot = document.createElement("button");
    dot.className = `dot${i === page ? " active" : ""}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir para a página ${i + 1}`);
    dot.addEventListener("click", () => { page = i; updateCarousel(); });
    dotsContainer.append(dot);
  }
}

function updateCarousel() {
  if (!questions.length || !track.querySelector(".faq-card")) return;
  page = Math.min(page, pageCount() - 1);
  const card = track.querySelector(".faq-card");
  const gap = 18;
  const distance = (card.getBoundingClientRect().width + gap) * cardsPerPage() * page;
  track.style.transform = `translateX(-${distance}px)`;
  [...dotsContainer.children].forEach((dot, index) => dot.classList.toggle("active", index === page));
}

async function loadQuestions() {
  const status = document.getElementById("apiStatus");
  try {
    const response = await fetch(`${API_BASE}/faqs`);
    if (!response.ok) throw new Error("Não foi possível consultar as perguntas.");
    questions = await response.json();
    status.textContent = "Perguntas carregadas do banco de dados.";
    renderQuestions();
  } catch (error) {
    track.innerHTML = '<p class="loading-message">Não foi possível conectar ao servidor. Confira se o backend está em execução.</p>';
    status.textContent = "Servidor indisponível.";
    console.error(error);
  }
}

function openAnswer(item) {
  document.getElementById("modalCategory").textContent = item.category || "DÚVIDA";
  document.getElementById("modalTitle").textContent = item.question;
  document.getElementById("modalAnswer").textContent = item.answer;
  modal.hidden = false;
  document.getElementById("closeModal").focus();
}
function closeModal() { modal.hidden = true; }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

document.getElementById("prevFaq").addEventListener("click", () => {
  page = (page - 1 + pageCount()) % pageCount();
  updateCarousel();
});
document.getElementById("nextFaq").addEventListener("click", () => {
  page = (page + 1) % pageCount();
  updateCarousel();
});
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("modalOk").addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

document.querySelectorAll("[data-area]").forEach(button => {
  button.addEventListener("click", () => showToast(`A área "${button.dataset.area}" será desenvolvida na próxima etapa.`));
});
const menuToggle = document.getElementById("menuToggle");
const nav = document.querySelector(".main-nav");
menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "×" : "☰";
});
window.addEventListener("resize", () => {
  if (questions.length) { renderDots(); updateCarousel(); }
});
loadQuestions();
