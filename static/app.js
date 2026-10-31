const statusFilter = document.querySelector("#status-filter");
const searchInput = document.querySelector("#search-input");
const animalGrid = document.querySelector("#animal-grid");
const resultCount = document.querySelector("#result-count");
const message = document.querySelector("#message");

let currentAnimals = [];
let activeRequest = null;

function getStatus(animal) {
  return animal.conservationStatus || "Unknown";
}

function getAnimalName(animal) {
  return animal.name || animal.commonName || animal.scientificName || "Unknown animal";
}

function getSummary(animal) {
  if (typeof animal.summary === "string") return animal.summary;
  if (typeof animal.description === "string") return animal.description;

  if (Array.isArray(animal.facts) && animal.facts.length > 0) {
    const firstFact = animal.facts[0];

    if (typeof firstFact === "string") return firstFact;

    if (firstFact && typeof firstFact === "object") {
      return firstFact.text || firstFact.value || firstFact.description || "";
    }
  }

  return "";
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderAnimals() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  const filteredAnimals = currentAnimals.filter((animal) => {
    const searchableText = [
      getAnimalName(animal),
      animal.scientificName || "",
      animal.category || "",
      animal.taxonomy?.class || ""
    ].join(" ").toLowerCase();

    return searchableText.includes(searchTerm);
  });

  const fragment = document.createDocumentFragment();

  for (const animal of filteredAnimals) {
    const card = document.createElement("article");
    card.className = "animal-card";

    const topLine = document.createElement("div");
    topLine.className = "card-topline";

    topLine.append(
      createTextElement(
        "span",
        "animal-category",
        animal.category || animal.taxonomy?.class || "Animal"
      ),
      createTextElement("span", "status-badge", getStatus(animal))
    );

    card.append(topLine);
    card.append(createTextElement("h3", "", getAnimalName(animal)));

    if (animal.scientificName) {
      card.append(
        createTextElement("p", "scientific-name", animal.scientificName)
      );
    }

    const summary = getSummary(animal);
    if (summary) {
      card.append(createTextElement("p", "animal-summary", summary));
    }

    if (animal.canonicalUrl) {
      try {
        const url = new URL(animal.canonicalUrl);

        if (url.protocol === "https:" || url.protocol === "http:") {
          const link = document.createElement("a");
          link.className = "animal-link";
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "View species profile →";
          card.append(link);
        }
      } catch {
        // Bỏ qua đường dẫn hồ sơ không hợp lệ.
      }
    }

    fragment.append(card);
  }

  // Chỉ thay danh sách sau khi đã dựng xong toàn bộ kết quả.
  animalGrid.replaceChildren(fragment);

  resultCount.textContent = `${filteredAnimals.length} species`;
  message.textContent = filteredAnimals.length
    ? ""
    : "No animals found. Try another search or status.";
}

async function loadStatuses() {
  const response = await fetch("/api/statuses");

  if (!response.ok) {
    throw new Error("Could not load conservation statuses.");
  }

  const data = await response.json();
  const statuses = Array.isArray(data.statuses) ? data.statuses : [];

  statusFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All conservation statuses";
  statusFilter.append(allOption);

  for (const status of statuses) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    statusFilter.append(option);
  }

  statusFilter.disabled = false;
}

async function loadAnimals() {
  // Hủy request cũ nếu người dùng đổi lựa chọn liên tục.
  if (activeRequest) {
    activeRequest.abort();
  }

  activeRequest = new AbortController();
  const requestController = activeRequest;

  const params = new URLSearchParams();
  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }

  const query = params.toString();
  const endpoint = query ? `/api/animals?${query}` : "/api/animals";

  // Không xóa danh sách cũ khi đang chờ phản hồi.
  animalGrid.setAttribute("aria-busy", "true");
  message.textContent = "Updating results…";

  try {
    const response = await fetch(endpoint, {
      signal: requestController.signal
    });

    if (!response.ok) {
      throw new Error("The animal API returned an error.");
    }

    const data = await response.json();
    currentAnimals = Array.isArray(data.animals) ? data.animals : [];
    renderAnimals();
  } catch (error) {
    if (error.name === "AbortError") return;

    console.error(error);
    message.className = "message error";
    message.textContent =
      "Animal data could not be loaded. Please try again.";
  } finally {
    if (activeRequest === requestController) {
      animalGrid.removeAttribute("aria-busy");
      activeRequest = null;
    }
  }
}

async function startApp() {
  try {
    await loadStatuses();
    await loadAnimals();
  } catch (error) {
    console.error(error);
    statusFilter.disabled = true;
    resultCount.textContent = "Data unavailable";
    message.className = "message error";
    message.textContent =
      "Could not load the dataset. Check that data/animals.json exists.";
  }
}

statusFilter.addEventListener("change", loadAnimals);
searchInput.addEventListener("input", renderAnimals);

startApp();
