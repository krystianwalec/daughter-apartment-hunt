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
    budget: "At / under target",
    ideal: "Ideal band",
    stretch: "Stretch",
    over: "Over band",
    mfte: "MFTE / dual price",
    gone: "Likely gone",
  };

  let ALL = [];
  let ALL1 = [];
  let workplaces = [];
  let map, markersLayer;
  let map1, markersLayer1;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function itemLi(it) {
    const text = esc(it.text || it);
    if (it && it.href)
      return `<li><a href="${esc(it.href)}" target="_blank" rel="noopener">${text}</a></li>`;
    return `<li>${text}</li>`;
  }

  function renderLog(entries) {
    const root = document.getElementById("log-feed");
    if (!root) return;
    if (!entries || !entries.length) {
      root.innerHTML = "<p class='lede'>No daily notes yet.</p>";
      return;
    }
    root.innerHTML = entries
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((e) => {
        const d = esc(e.date);
        const newL = (e.new || []).map(itemLi).join("");
        const ch = (e.changed || []).map(itemLi).join("");
        return `<article class="log-entry">
          <time datetime="${d}">${d}</time>
          <h3>${esc(e.title)}</h3>
          ${e.lede ? `<p class="lede">${esc(e.lede)}</p>` : ""}
          ${newL ? `<h4>New</h4><ul>${newL}</ul>` : ""}
          ${ch ? `<h4>Tracked</h4><ul>${ch}</ul>` : ""}
        </article>`;
      })
      .join("");
  }

  function loadUpdates() {
    return fetch("updates.json")
      .then((r) => {
        if (!r.ok) throw new Error("no updates");
        return r.json();
      })
      .catch(() => window.HUNT_UPDATES || { entries: [] });
  }

  function loadData() {
    return fetch("listings.json")
      .then((r) => {
        if (!r.ok) throw new Error("no json");
        return r.json();
      })
      .catch(() => window.APARTMENT_DATA);
  }

  function loadData1() {
    return fetch("listings1.json")
      .then((r) => {
        if (!r.ok) throw new Error("no 1br json");
        return r.json();
      })
      .catch(() => window.APARTMENT_DATA_1BR || { listings: [] });
  }

  function corridorBadge(l) {
    if (l.corridor === "i90") return "I-90";
    if (l.corridor === "link-north") return "1 Line north";
    if (l.region === "eastside") return "Eastside";
    return "Seattle";
  }

  function cardHtml(l, flyAttr) {
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
        <span class="badge">${corridorBadge(l)}</span>
        <span class="badge ${evClass}">${evLabel[l.ev] || l.ev}</span>
        <span class="badge ${l.fit === "over" || l.fit === "gone" ? "over" : ""} ${l.fit === "mfte" ? "mfte" : ""}">${fitLabel[l.fit] || l.fit}</span>
        <span class="badge">${l.beds}BR</span>
      </div>
      <div class="meta">Parking: ${l.parking}${l.parkingFee ? " (" + money(l.parkingFee) + (l.parkingFeeMax ? "–" + money(l.parkingFeeMax) : "") + ")" : ""}</div>
      <div class="meta">Utils: ${l.utils}</div>
      <div class="meta">A: ${l.commuteA}<br>B: ${l.commuteB}</div>
      ${l.rangeNote ? `<div class="meta">${l.rangeNote}</div>` : ""}
      <p class="meta">${l.notes || ""}</p>
      <button type="button" ${flyAttr}="${l.id}">Show on map</button>
      ${l.url ? `<a href="${l.url}" target="_blank" rel="noopener">Listing</a>` : ""}
    </article>`;
  }

  function renderCards(list) {
    const root = document.getElementById("cards");
    document.getElementById("count").textContent = list.length + " homes";
    root.innerHTML = list.map((l) => cardHtml(l, "data-fly")).join("");
  }

  function renderCards1(list) {
    const root = document.getElementById("cards1");
    const count = document.getElementById("count1");
    if (!root) return;
    if (count) count.textContent = list.length + " homes";
    root.innerHTML = list.map((l) => cardHtml(l, "data-fly1")).join("");
  }

  function activeFilters() {
    const on = [...document.querySelectorAll(".filters:not(#filters1) button.is-on")].map(
      (b) => b.dataset.filter
    );
    const q = (document.getElementById("q") || { value: "" }).value
      .trim()
      .toLowerCase();
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
        if (f === "north" && l.corridor !== "link-north") return false;
      }
      return true;
    });
  }

  function activeFilters1() {
    const box = document.getElementById("filters1");
    if (!box) return ALL1;
    const on = [...box.querySelectorAll("button.is-on")].map(
      (b) => b.dataset.filter1
    );
    const q = (document.getElementById("q1") || { value: "" }).value
      .trim()
      .toLowerCase();
    return ALL1.filter((l) => {
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
        if (f === "under1500" && l.rentMin > 1500) return false;
        if (f === "under1800" && l.rentMin > 1800) return false;
        if (f === "i90" && l.corridor !== "i90") return false;
        if (f === "north" && l.corridor !== "link-north") return false;
      }
      return true;
    });
  }

  function rentForSize(l) {
    return Number(l.rentMin) || 1500;
  }

  function rentRadius(rent, minR, maxR) {
    const t = (rent - minR) / Math.max(1, maxR - minR);
    return 7 + t * 16;
  }

  function rentColor(rent) {
    const stops = [
      [1300, [46, 134, 122]],
      [1600, [61, 139, 154]],
      [1900, [212, 160, 23]],
      [2400, [196, 107, 58]],
      [3200, [155, 61, 74]],
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

  function paintMarkers(layer, list, fallbackPool, mapRef) {
    layer.clearLayers();
    const pool = list.length ? list : fallbackPool;
    if (!pool.length) {
      workplaces.forEach((w) => {
        const color = w.who === "A" ? "#c46b3a" : "#2a3f73";
        L.circleMarker([w.lat, w.lng], {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: color,
          fillOpacity: 1,
        })
          .bindPopup(
            `<strong>${w.who}: ${w.name}</strong><br>${w.address}<br><em>${w.note}</em>`
          )
          .addTo(layer);
      });
      return;
    }
    const rents = pool.map(rentForSize);
    const minR = Math.min(...rents);
    const maxR = Math.max(...rents);
    workplaces.forEach((w) => {
      const color = w.who === "A" ? "#c46b3a" : "#2a3f73";
      L.circleMarker([w.lat, w.lng], {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(
          `<strong>${w.who}: ${w.name}</strong><br>${w.address}<br><em>${w.note}</em>`
        )
        .addTo(layer);
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
      m.addTo(layer);
    });
  }

  function addMarkers(list) {
    if (!markersLayer) return;
    paintMarkers(markersLayer, list, ALL);
  }

  function addMarkers1(list) {
    if (!markersLayer1) return;
    paintMarkers(markersLayer1, list, ALL1);
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

  function flyTo1(id) {
    const l = ALL1.find((x) => x.id === id);
    if (!l || !map1) return;
    map1.flyTo([l.lat, l.lng], 15, { duration: 0.8 });
    markersLayer1.eachLayer((layer) => {
      if (layer._listingId === id) layer.openPopup();
    });
    document.getElementById("map1").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function apply() {
    const list = activeFilters();
    renderCards(list);
    addMarkers(list.length ? list : ALL);
  }

  function apply1() {
    const list = activeFilters1();
    renderCards1(list);
    addMarkers1(list.length ? list : ALL1);
  }

  function initMapEl(elId) {
    const m = L.map(elId, { scrollWheelZoom: true }).setView([47.66, -122.28], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    const layer = L.layerGroup().addTo(m);
    setTimeout(() => m.invalidateSize(), 200);
    return { map: m, layer };
  }

  function wireFilterToggle(containerSel, allAttr, allValue, onApply) {
    const box = document.querySelector(containerSel);
    if (!box) return;
    box.addEventListener("click", (e) => {
      const b = e.target.closest(`button[${allAttr}]`);
      if (!b) return;
      if (b.getAttribute(allAttr) === allValue) {
        box.querySelectorAll(`button[${allAttr}]`).forEach((x) => x.classList.remove("is-on"));
        b.classList.add("is-on");
      } else {
        const allBtn = box.querySelector(`button[${allAttr}="${allValue}"]`);
        if (allBtn) allBtn.classList.remove("is-on");
        b.classList.toggle("is-on");
      }
      onApply();
    });
  }

  Promise.all([loadData(), loadData1(), loadUpdates()]).then(
    ([data, data1, updates]) => {
      ALL = (data && data.listings) || [];
      ALL1 = (data1 && data1.listings) || [];
      workplaces = (data && data.workplaces) || [];
      document.getElementById("as-of").textContent =
        "Data as of " + ((data && data.asOf) || (data1 && data1.asOf) || "3 Sep 2026");
      renderLog((updates && updates.entries) || []);

      const m0 = initMapEl("map");
      map = m0.map;
      markersLayer = m0.layer;
      apply();

      if (document.getElementById("map1")) {
        const m1 = initMapEl("map1");
        map1 = m1.map;
        markersLayer1 = m1.layer;
        apply1();
      }

      wireFilterToggle(".filters:not(#filters1)", "data-filter", "all", apply);
      wireFilterToggle("#filters1", "data-filter1", "all", apply1);

      const q = document.getElementById("q");
      if (q) q.addEventListener("input", apply);
      const q1 = document.getElementById("q1");
      if (q1) q1.addEventListener("input", apply1);

      document.getElementById("cards").addEventListener("click", (e) => {
        const b = e.target.closest("[data-fly]");
        if (b) flyTo(b.dataset.fly);
      });
      const cards1 = document.getElementById("cards1");
      if (cards1) {
        cards1.addEventListener("click", (e) => {
          const b = e.target.closest("[data-fly1]");
          if (b) flyTo1(b.dataset.fly1);
        });
      }
    }
  );
})();
