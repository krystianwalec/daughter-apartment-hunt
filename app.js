(function () {
  const money = (n) =>
    n == null ? "—" : "$" + Number(n).toLocaleString("en-US");

  const evLabel = {
    yes: "EV yes",
    no: "EV no",
    unknown: "EV unknown",
    unverified: "EV unverified",
    listing: "EV on listing",
    "likely-no": "EV likely no",
  };

  const fitLabel = {
    budget: "At / under $1.8k",
    ideal: "Ideal band",
    stretch: "Stretch",
    over: "Over band",
    mfte: "MFTE / dual price",
  };

  let ALL = [];
  let workplaces = [];
  let map, markersLayer;

  function loadData() {
    return fetch("listings.json")
      .then((r) => {
        if (!r.ok) throw new Error("no json");
        return r.json();
      })
      .catch(() => window.APARTMENT_DATA);
  }

  function renderCards(list) {
    const root = document.getElementById("cards");
    document.getElementById("count").textContent = list.length + " homes";
    root.innerHTML = list
      .map((l) => {
        const range =
          l.rentMin === l.rentMax
            ? money(l.rentMin)
            : money(l.rentMin) + "–" + money(l.rentMax);
        const evClass =
          l.ev === "yes"
            ? "ev-yes"
            : l.ev === "no" || l.ev === "likely-no"
            ? "ev-no"
            : "ev-unknown";
        return `<article class="card" data-id="${l.id}">
          <header>
            <h3>${l.name}</h3>
            <div class="price">${range}</div>
          </header>
          <div class="meta">${l.address}</div>
          <div class="badges">
            <span class="badge">${l.corridor === "i90" ? "I-90" : l.region === "eastside" ? "Eastside" : "Seattle"}</span>
            <span class="badge ${evClass}">${evLabel[l.ev] || l.ev}</span>
            <span class="badge ${l.fit === "over" ? "over" : ""} ${l.fit === "mfte" ? "mfte" : ""}">${fitLabel[l.fit] || l.fit}</span>
            <span class="badge">${l.beds}BR</span>
          </div>
          <div class="meta">Parking: ${l.parking}${l.parkingFee ? " (" + money(l.parkingFee) + (l.parkingFeeMax ? "–" + money(l.parkingFeeMax) : "") + ")" : ""}</div>
          <div class="meta">Utils: ${l.utils}</div>
          <div class="meta">A: ${l.commuteA}<br>B: ${l.commuteB}</div>
          ${l.rangeNote ? `<div class="meta">${l.rangeNote}</div>` : ""}
          <p class="meta">${l.notes}</p>
          <button type="button" data-fly="${l.id}">Show on map</button>
          ${l.url ? `<a href="${l.url}" target="_blank" rel="noopener">Listing</a>` : ""}
        </article>`;
      })
      .join("");
  }

  function activeFilters() {
    const on = [...document.querySelectorAll(".filters button.is-on")].map(
      (b) => b.dataset.filter
    );
    const q = document.getElementById("q").value.trim().toLowerCase();
    return ALL.filter((l) => {
      if (q) {
        const blob = [l.name, l.address, l.complex, l.notes, l.cluster]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      for (const f of on) {
        if (f === "eastside" && l.region !== "eastside") return false;
        if (f === "seattle" && l.region !== "seattle") return false;
        if (f === "ev" && !(l.ev === "yes" || l.ev === "listing")) return false;
        if (f === "under2250" && l.rentMin > 2250) return false;
        if (f === "under2000" && l.rentMin > 2000) return false;
        if (f === "walk-b" && l.cluster !== "interbay") return false;
        if (f === "drive-a" && l.region !== "eastside") return false;
        if (f === "i90" && l.corridor !== "i90") return false;
      }
      return true;
    });
  }

  function rentForSize(l) {
    return Number(l.rentMin) || 1800;
  }

  function rentRadius(rent, minR, maxR) {
    const t = (rent - minR) / Math.max(1, maxR - minR);
    return 7 + t * 16;
  }

  function rentColor(rent) {
    const stops = [
      [1600, [46, 134, 122]],
      [2000, [61, 139, 154]],
      [2400, [212, 160, 23]],
      [3000, [196, 107, 58]],
      [3800, [155, 61, 74]],
    ];
    if (rent <= stops[0][0]) {
      const [r, g, b] = stops[0][1];
      return `rgb(${r},${g},${b})`;
    }
    if (rent >= stops.at(-1)[0]) {
      const [r, g, b] = stops.at(-1)[1];
      return `rgb(${r},${g},${b})`;
    }
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i];
      const [b, cb] = stops[i + 1];
      if (rent >= a && rent <= b) {
        const t = (rent - a) / (b - a);
        const rgb = ca.map((v, j) => Math.round(v + (cb[j] - v) * t));
        return `rgb(${rgb.join(",")})`;
      }
    }
    return "#c46b3a";
  }

  function addMarkers(list) {
    markersLayer.clearLayers();
    const rents = (list.length ? list : ALL).map(rentForSize);
    const minR = Math.min(...rents, 1700);
    const maxR = Math.max(...rents, 3500);
    workplaces.forEach((w) => {
      const color = w.who === "A" ? "#c46b3a" : "#2a3f73";
      const m = L.circleMarker([w.lat, w.lng], {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      }).bindPopup(
        `<strong>${w.who}: ${w.name}</strong><br>${w.address}<br><em>${w.note}</em>`
      );
      m.addTo(markersLayer);
    });
    list.forEach((l) => {
      const rent = rentForSize(l);
      const m = L.circleMarker([l.lat, l.lng], {
        radius: rentRadius(rent, minR, maxR),
        color: "#fff",
        weight: 1.5,
        fillColor: rentColor(rent),
        fillOpacity: 0.82,
      }).bindPopup(
        `<strong>${l.name}</strong><br>${money(l.rentMin)}${
          l.rentMax !== l.rentMin ? "–" + money(l.rentMax) : ""
        }<br>${l.address}<br>EV: ${l.ev}`
      );
      m._listingId = l.id;
      m.addTo(markersLayer);
    });
  }

  function flyTo(id) {
    const l = ALL.find((x) => x.id === id);
    if (!l || !map) return;
    map.flyTo([l.lat, l.lng], 15, { duration: 0.8 });
    markersLayer.eachLayer((layer) => {
      if (layer._listingId === id) layer.openPopup();
    });
    document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function apply() {
    const list = activeFilters();
    renderCards(list);
    addMarkers(list.length ? list : ALL);
  }

  function initMap() {
    map = L.map("map", { scrollWheelZoom: true }).setView(
      [47.66, -122.28],
      11
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }

  loadData().then((data) => {
    ALL = data.listings;
    workplaces = data.workplaces;
    document.getElementById("as-of").textContent = "Data as of " + (data.asOf || "1 Sep 2026");
    initMap();
    apply();
    document.querySelector(".filters").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-filter]");
      if (!b) return;
      if (b.dataset.filter === "all") {
        document
          .querySelectorAll(".filters button[data-filter]")
          .forEach((x) => x.classList.remove("is-on"));
        b.classList.add("is-on");
      } else {
        document
          .querySelector('[data-filter="all"]')
          .classList.remove("is-on");
        b.classList.toggle("is-on");
      }
      apply();
    });
    document.getElementById("q").addEventListener("input", apply);
    document.getElementById("cards").addEventListener("click", (e) => {
      const b = e.target.closest("[data-fly]");
      if (b) flyTo(b.dataset.fly);
    });
  });
})();
