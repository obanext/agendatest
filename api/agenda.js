function updateTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("time").textContent = `${hh}:${mm}`;
}
updateTime();
setInterval(updateTime, 60000);

function getParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

async function fetchAgenda() {
  const when = getParam("when") || "b_thisweek";
  const where = getParam("where") || "";
  let screen = parseInt(getParam("screen") || "1");

  const res = await fetch(
    `/api/agenda?when=${encodeURIComponent(when)}&where=${encodeURIComponent(where)}&screen=${screen}`
  );
  const data = await res.json();

  // update header indicator
  document.getElementById("screenIndicator").textContent = `${data.screen}/${data.totalScreens}`;

  const container = document.getElementById("agenda");
  container.innerHTML = "";

  data.items.forEach((event, i) => {
    const date = new Date(event.startRaw);
    const dag = date.toLocaleDateString("nl-NL", { weekday: "long" });
    const dagNum = String(date.getDate()).padStart(2, "0");
    const maand = date.toLocaleDateString("nl-NL", { month: "short" }).toLowerCase();
    const tijd = date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");

    if (i > 0) {
      const spaceTop = document.createElement("div");
      spaceTop.style.height = "2px";
      container.appendChild(spaceTop);
    }

    const row = document.createElement("div");
    row.className =
      "grid grid-cols-[140px_70px_1fr_90px] items-center px-10 gap-6";

    row.innerHTML = `
      <div class="text-[26px] lowercase">${dag}</div>

      <div class="bg-black text-white font-black text-center w-16 h-16 flex flex-col justify-center leading-none">
        <div class="text-[26px]">${dagNum}</div>
        <div class="text-[14px] uppercase">${maand}</div>
      </div>

      <div class="flex flex-col overflow-hidden">
        <div class="text-[28px] font-black leading-tight line-clamp-1">${event.title}</div>
        <div class="text-[#e7a024] text-[18px]" style="font-family:AvenirLight;">${event.locatie}</div>
      </div>

      <div class="text-[26px] font-black text-right">${tijd}</div>
    `;

    container.appendChild(row);

    const spaceBottom = document.createElement("div");
    spaceBottom.style.height = "2px";
    container.appendChild(spaceBottom);

    if (i < data.items.length - 1) {
      const divider = document.createElement("div");
      divider.style.height = "1px";
      divider.style.background = "#e7a024";
      container.appendChild(divider);
    }
  });

  // auto-rotate every 10 sec
  setTimeout(() => {
    let next = data.screen + 1;
    if (next > data.totalScreens) next = 1;

    const url = new URL(window.location.href);
    url.searchParams.set("screen", next);
    window.location.href = url.toString();
  }, 10000);
}

fetchAgenda();
