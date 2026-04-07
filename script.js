const champions = [
  { name: "Ahri", role: "mage", lane: "Mid" },
  { name: "Zed", role: "assassin", lane: "Mid" },
  { name: "Leona", role: "tank", lane: "Support" },
  { name: "Gragas", role: "tank", lane: "Jungle" },
  { name: "Katarina", role: "assassin", lane: "Mid" },
  { name: "Orianna", role: "mage", lane: "Mid" },
];

const list = document.getElementById("champion-list");
const filters = document.querySelectorAll(".filter");

function render(role = "all") {
  const filtered = role === "all" ? champions : champions.filter((c) => c.role === role);

  list.innerHTML = filtered
    .map(
      (champion) => `
      <article class="card champion-card">
        <h3>${champion.name}</h3>
        <p>Lane favorite : ${champion.lane}</p>
        <span class="badge">${champion.role}</span>
      </article>
    `,
    )
    .join("");
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    render(button.dataset.role);
  });
});

render();
