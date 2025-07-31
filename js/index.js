//buradaki kodlar, arama çubuğunda benzer kelimelerin çıkmasını sağlıyor.
const reservedWords = {
  "protein": "protein.html",
  "meal plan": "meal-plan.html",
  "intermittent fasting": "fasting.html",
  "HIIT": "hiit.html",
  "calories": "calories.html",
  "strength training": "strength.html",
  "hydration": "hydration.html",
  "sleep": "sleep.html",
  "supplements": "supplements.html",
  "fiber": "fiber.html",
  "macronutrients": "macros.html",
  "cardio": "cardio.html",
  "metabolism": "metabolism.html",
  "BMI": "bmi.html",
  "vitamins": "vitamins.html",
  "creatine": "creatine.html",
  "cutting": "cutting.html",
  "bulking": "bulking.html",
  "body fat": "bodyfat.html"
};

function showSuggestions() {
  const input = document.getElementById("searchInput");
  const filter = input.value.toLowerCase();
  const list = document.getElementById("suggestionsList");

  list.innerHTML = '';

  if (!filter) {
    list.style.display = 'none';
    return;
  }

  const matched = Object.keys(reservedWords).filter(word =>
    word.toLowerCase().includes(filter)
  );

  if (matched.length === 0) {
    list.style.display = 'none';
    return;
  }

  matched.forEach(word => {
    const li = document.createElement("li");
    li.textContent = word;
    li.onclick = () => {
      window.location.href = reservedWords[word]; // Redirect user
    };
    list.appendChild(li);
  });

  list.style.display = 'block';
}

  // Optional: hide suggestions if user clicks outside
  document.addEventListener("click", function (e) {
    const input = document.getElementById("searchInput");
    const list = document.getElementById("suggestionsList");
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.style.display = "none";
    }
  });

