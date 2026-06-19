/**
 * Hotspots.js — Interactive high-injury corridor map
 * Loads GeoJSON, renders polyline corridors, handles selection & profiles.
 *
 * Navigation design (2026-06-07):
 *   - The map stays in a stable "all corridors" overview by default. Selecting a
 *     corridor highlights it and (only if it is off-screen) gently pans — it
 *     never re-zooms. This avoids the constant zoom-in/zoom-out churn that made
 *     the map hard to follow.
 *   - Numbered rank badges mark each corridor so they're identifiable without
 *     clicking, and a "Fit all corridors" button restores the overview after any
 *     manual zoom.
 */

let map;
let hotspotsData;
let corridorLayers = {};
let corridorMarkers = {};
let allBounds = null;
let selectedCorridor = null;

// DC map center and bounds
const DC_CENTER = [38.9072, -77.0369];
const DC_BOUNDS = [
  [38.78, -77.13],
  [38.995, -76.91]
];

async function initMap() {
  // Load hotspots GeoJSON first
  try {
    const response = await fetch('data/hotspots.geojson');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    hotspotsData = await response.json();
  } catch (error) {
    console.error('Failed to load hotspots data:', error);
    hotspotsData = null;
  }

  // Sidebar + summary load regardless of whether the map renders.
  populateSidebar();
  renderSummary();

  // Try to initialize map (it's OK if this fails)
  if (!document.getElementById('hotspots-map')) {
    console.warn('Map container not found');
    return;
  }

  try {
    map = L.map('hotspots-map', { zoomControl: true }).setView(DC_CENTER, 12);

    // Base tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      maxBounds: DC_BOUNDS
    }).addTo(map);

    // Render corridors on map
    renderCorridors();
    addLegend();
    wireFitAllButton();

    // Highlight the top corridor without flying the map or scrolling the page —
    // the overview already shows it, so there's nothing to pan to.
    selectCorridor(0, { focus: false, scrollCard: false });

    // Frame all corridors once layout has settled. Doing this synchronously at
    // init races the container size and can over-zoom, so defer one frame and
    // re-measure first.
    requestAnimationFrame(fitAll);
  } catch (error) {
    console.error('Map init error:', error);
    const container = document.getElementById('hotspots-map');
    if (container) {
      container.innerHTML = `<p style="padding: 20px; color: var(--severity-fatal); font-size: 14px;">Map unavailable: ${error.message}. Corridor details are listed on the right.</p>`;
    }
  }
}

function renderCorridors() {
  if (!hotspotsData || !hotspotsData.features) return;

  hotspotsData.features.forEach((feature, idx) => {
    const { coordinates } = feature.geometry;
    const { rank, corridor_name } = feature.properties;
    const latlngs = coordinates.map(([lng, lat]) => [lat, lng]);

    // Create polyline for corridor
    const polyline = L.polyline(latlngs, {
      color: getColorByRank(rank),
      weight: 4,
      opacity: 0.7,
      lineCap: 'round',
      lineJoin: 'round',
      className: `hotspot-polyline hotspot-polyline-rank${rank}`
    }).addTo(map);
    corridorLayers[idx] = polyline;

    // Numbered rank badge at the corridor midpoint so each line is
    // identifiable at a glance, without clicking to find out which is which.
    const mid = latlngs[Math.floor(latlngs.length / 2)];
    const marker = L.marker(mid, {
      icon: makeRankIcon(rank),
      keyboard: false,
      title: `Rank #${rank}: ${corridor_name}`,
      riseOnHover: true
    }).addTo(map);
    corridorMarkers[idx] = marker;

    polyline.on('click', () => selectCorridor(idx));
    marker.on('click', () => selectCorridor(idx));

    // Hover effect
    polyline.on('mouseover', () => polyline.setStyle({ weight: 6, opacity: 1 }));
    polyline.on('mouseout', () => {
      if (selectedCorridor !== idx) polyline.setStyle({ weight: 4, opacity: 0.7 });
    });
  });

  // Record the stable overview extent that frames all corridors. The actual
  // fitBounds happens in fitAll(), deferred until layout settles.
  const all = hotspotsData.features.flatMap(f =>
    f.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  );
  if (all.length > 0) allBounds = L.latLngBounds(all);
}

// Frame all corridors. Re-measures the container first so an initial size race
// can't over-zoom the map.
function fitAll() {
  if (!map || !allBounds) return;
  map.invalidateSize();
  map.fitBounds(allBounds, { padding: [40, 40] });
}

function makeRankIcon(rank) {
  return L.divIcon({
    className: 'corridor-marker',
    html: `<span class="corridor-marker-badge" style="background:${getColorByRank(rank)}">${rank}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

// Small color/number key pinned to the map corner.
function addLegend() {
  // Derive the gold (rank 5+) band from the corridors actually rendered so the
  // legend describes the full ranking (getColorByRank lumps every rank >= 5 into
  // the same colour), and can't drift when TOP_N changes.
  const ranks = (hotspotsData && hotspotsData.features || []).map(f => f.properties.rank);
  const maxRank = ranks.length ? Math.max(...ranks) : 5;
  const goldLabel = maxRank > 5 ? `Rank 5–${maxRank} · high` : 'Rank 5 · high';
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = `
      <div class="map-legend-title">Priority rank — most to least severe</div>
      <div class="row"><span class="swatch" style="background:${cssVar('--severity-fatal')}"></span> Rank 1–2 · urgent</div>
      <div class="row"><span class="swatch" style="background:${cssVar('--severity-major')}"></span> Rank 3–4 · high</div>
      <div class="row"><span class="swatch" style="background:${cssVar('--severity-minor')}"></span> ${goldLabel}</div>
    `;
    return div;
  };
  legend.addTo(map);
}

function wireFitAllButton() {
  const btn = document.getElementById('fit-all-btn');
  if (btn) btn.addEventListener('click', fitAll);
}

// Top-of-page rollup so the headline numbers are visible before any clicking.
function renderSummary() {
  const el = document.getElementById('hotspots-summary');
  if (!el) return;
  if (!hotspotsData || !hotspotsData.features) {
    el.innerHTML = '<span class="summary-note">Corridor data unavailable.</span>';
    return;
  }

  const feats = hotspotsData.features;
  const sum = (key) => feats.reduce((t, f) => t + (f.properties.severity[key] || 0), 0);
  const wards = new Set();
  feats.forEach(f => (f.properties.ward || '').split(',').forEach(w => {
    const t = w.trim();
    if (t) wards.add(t);
  }));

  el.innerHTML = `
    <div class="summary-stat"><span class="num">${feats.length}</span><span class="lbl">Priority corridors</span></div>
    <div class="summary-stat"><span class="num fatal">${sum('ksi').toLocaleString()}</span><span class="lbl">People killed or seriously injured</span></div>
    <div class="summary-stat"><span class="num fatal">${sum('fatalities').toLocaleString()}</span><span class="lbl">Deaths</span></div>
    <div class="summary-stat"><span class="num">${sum('crashes').toLocaleString()}</span><span class="lbl">Crashes (2022–2026)</span></div>
    <div class="summary-stat"><span class="num">${wards.size}</span><span class="lbl">Wards touched</span></div>
    <div class="summary-spacer"></div>
    <button type="button" id="fit-all-btn" class="fit-all-btn">⤢ Fit all corridors</button>
  `;
}

function populateSidebar() {
  const sidebar = document.getElementById('hotspots-sidebar');
  sidebar.innerHTML = '';

  if (!hotspotsData || !hotspotsData.features) return;

  hotspotsData.features.forEach((feature, idx) => {
    const card = createCorridorCard(feature.properties, idx);
    sidebar.appendChild(card);
  });
}

function createCorridorCard(props, idx) {
  const card = document.createElement('div');
  card.className = 'hotspot-card';
  card.id = `corridor-card-${idx}`;
  card.dataset.index = idx;

  // Extract fixes (just names for minimal profile)
  const fixes = (props.recommended_interventions || []).slice(0, 2);

  // Vulnerable-road-user glance: how many of the KSI were people walking or
  // biking. Surfaces "who is being hurt here" without opening the full analysis.
  const mode = props.mode_breakdown || {};
  const ped = mode.pedestrian_ksi || 0;
  const bike = mode.cyclist_ksi || 0;
  const modeLine = (ped || bike)
    ? `<div class="hotspot-modes" title="People killed or seriously injured while walking or biking on this corridor">
        <span class="mode-stat">${ped} walking</span>
        <span class="mode-dot">·</span>
        <span class="mode-stat">${bike} biking</span>
        <span class="mode-suffix">KSI</span>
      </div>`
    : '';

  // Priority badge
  const priorityClass = props.priority === 'URGENT' ? 'urgent' : 'high';
  const priorityBadge = `<span class="priority-badge ${priorityClass}">${props.priority}</span>`;

  // KSI is the ranking basis, so lead with it and make its composition explicit
  // (killed + seriously injured), then total injuries for context.
  const sev = props.severity || {};
  const ksi = sev.ksi != null ? sev.ksi : (sev.fatalities || 0) + (sev.major_injuries || 0);

  card.innerHTML = `
    <div class="hotspot-rank">Rank #${props.rank}</div>
    <div class="hotspot-name">${props.corridor_name}</div>
    <div class="hotspot-location">${props.location_scope}</div>
    <div class="hotspot-severity">
      <div class="severity-stat severity-stat-ksi" title="People killed or seriously (major) injured — the basis for this ranking">
        <span class="severity-value">${ksi}</span>
        <span class="severity-label">Killed / seriously injured</span>
      </div>
      <div class="severity-stat">
        <span class="severity-value">${sev.fatalities}</span>
        <span class="severity-label">Deaths</span>
      </div>
      <div class="severity-stat">
        <span class="severity-value">${sev.injuries}</span>
        <span class="severity-label">Total injured</span>
      </div>
    </div>
    <div class="hotspot-ksi-breakdown">${sev.fatalities} killed · ${sev.major_injuries} seriously injured</div>
    ${modeLine}
    <div class="hotspot-fixes">
      ${fixes.map(fix => `
        <div class="fix-item">
          <span class="fix-bullet"></span>
          <span class="fix-text">${fix.name}${fix.trigger ? `<span class="fix-trigger">${fix.trigger}</span>` : ''}</span>
        </div>
      `).join('')}
    </div>
    ${priorityBadge}
  `;

  card.addEventListener('click', () => selectCorridor(idx, { scrollCard: false }));

  return card;
}

/**
 * Select a corridor: highlight its polyline, badge, and sidebar card.
 * The map only moves when the corridor isn't already visible, and it never
 * changes zoom — so clicking through corridors feels calm, not jumpy.
 *
 * @param {number} idx
 * @param {{focus?: boolean, scrollCard?: boolean}} [opts]
 *   focus: allow a gentle pan if the corridor is off-screen (default true)
 *   scrollCard: scroll the sidebar card into view (default true)
 */
function selectCorridor(idx, opts = {}) {
  const { focus = true, scrollCard = true } = opts;
  if (!hotspotsData || !hotspotsData.features[idx]) return;

  // Deselect previous (works for sidebar even if the map failed to load)
  if (selectedCorridor !== null) {
    const prevCard = document.getElementById(`corridor-card-${selectedCorridor}`);
    if (prevCard) prevCard.classList.remove('active');
    if (corridorLayers[selectedCorridor]) {
      corridorLayers[selectedCorridor].setStyle({ weight: 4, opacity: 0.7 });
    }
    setMarkerActive(selectedCorridor, false);
  }

  // Select new
  selectedCorridor = idx;
  const card = document.getElementById(`corridor-card-${idx}`);
  if (card) {
    card.classList.add('active');
    if (scrollCard) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  if (!map || typeof L === 'undefined') return; // Guard against Leaflet load failure

  if (corridorLayers[idx]) {
    corridorLayers[idx].setStyle({ weight: 6, opacity: 1 });
    corridorLayers[idx].bringToFront();
  }
  setMarkerActive(idx, true);

  // Gentle focus: pan (never zoom) and only when the corridor is off-screen.
  if (focus) {
    const bounds = L.latLngBounds(
      hotspotsData.features[idx].geometry.coordinates.map(([lng, lat]) => [lat, lng])
    );
    if (!map.getBounds().contains(bounds)) {
      map.panTo(bounds.getCenter(), { animate: true });
    }
  }
}

function setMarkerActive(idx, active) {
  const m = corridorMarkers[idx];
  if (!m) return;
  const badge = m.getElement() && m.getElement().querySelector('.corridor-marker-badge');
  if (badge) badge.classList.toggle('active', active);
}

function getColorByRank(rank) {
  if (rank === 1 || rank === 2) return cssVar('--severity-fatal');
  if (rank === 3 || rank === 4) return cssVar('--severity-major');
  return cssVar('--severity-minor');
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Initialize on page load (map is optional; sidebar always loads)
document.addEventListener('DOMContentLoaded', initMap);
