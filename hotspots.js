/**
 * Hotspots.js — Interactive high-injury corridor map
 * Loads GeoJSON, renders polyline corridors, handles selection & profiles
 */

let map;
let hotspotsData;
let corridorLayers = {};
let selectedCorridor = null;

// DC map center and bounds
const DC_CENTER = [38.9072, -77.0369];
const DC_BOUNDS = [
  [38.78, -77.13],
  [38.995, -76.91]
];

async function initMap() {
  // Initialize Leaflet map
  map = L.map('hotspots-map').setView(DC_CENTER, 12);

  // Base tiles (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    maxBounds: DC_BOUNDS
  }).addTo(map);

  // Load hotspots GeoJSON
  try {
    const response = await fetch('data/hotspots.geojson');
    hotspotsData = await response.json();
    console.log('Hotspots loaded:', hotspotsData);

    // Render corridors on map
    renderCorridors();

    // Populate sidebar
    populateSidebar();

    // Select first corridor by default
    selectCorridor(0);
  } catch (error) {
    console.error('Error loading hotspots:', error);
    document.getElementById('hotspots-map').innerHTML = '<p style="padding: 20px; color: red;">Error loading hotspots data.</p>';
  }
}

function renderCorridors() {
  if (!hotspotsData || !hotspotsData.features) return;

  hotspotsData.features.forEach((feature, idx) => {
    const { coordinates } = feature.geometry;
    const { rank, corridor_name } = feature.properties;

    // Create polyline for corridor
    const polyline = L.polyline(
      coordinates.map(([lng, lat]) => [lat, lng]),
      {
        color: getColorByRank(rank),
        weight: 4,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
        className: `hotspot-polyline hotspot-polyline-rank${rank}`
      }
    ).addTo(map);

    // Store layer reference
    corridorLayers[idx] = polyline;

    // Click to select
    polyline.on('click', () => {
      selectCorridor(idx);
    });

    // Hover effect
    polyline.on('mouseover', () => {
      polyline.setStyle({ weight: 6, opacity: 1 });
    });

    polyline.on('mouseout', () => {
      if (selectedCorridor !== idx) {
        polyline.setStyle({ weight: 4, opacity: 0.7 });
      }
    });
  });

  // Fit map to all corridors
  const allCoordinates = hotspotsData.features
    .flatMap(f => f.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
  if (allCoordinates.length > 0) {
    const bounds = L.latLngBounds(allCoordinates);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

function populateSidebar() {
  const sidebar = document.getElementById('hotspots-sidebar');
  sidebar.innerHTML = '';

  if (!hotspotsData || !hotspotsData.features) return;

  hotspotsData.features.forEach((feature, idx) => {
    const props = feature.properties;
    const card = createCorridorCard(props, idx);
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

  // Priority badge
  const priorityClass = props.priority === 'URGENT' ? 'urgent' : 'high';
  const priorityBadge = `<span class="priority-badge ${priorityClass}">${props.priority}</span>`;

  card.innerHTML = `
    <div class="hotspot-rank">Rank #${props.rank}</div>
    <div class="hotspot-name">${props.corridor_name}</div>
    <div class="hotspot-location">${props.location_scope}</div>
    <div class="hotspot-severity">
      <div class="severity-stat">
        <span class="severity-value">${props.severity.injuries}</span>
        <span class="severity-label">Injuries</span>
      </div>
      <div class="severity-stat">
        <span class="severity-value">${props.severity.fatalities}</span>
        <span class="severity-label">Deaths</span>
      </div>
    </div>
    <div class="hotspot-fixes">
      ${fixes.map(fix => `
        <div class="fix-item">
          <span class="fix-bullet"></span>
          <span>${fix.name}</span>
        </div>
      `).join('')}
    </div>
    ${priorityBadge}
  `;

  card.addEventListener('click', () => selectCorridor(idx));

  return card;
}

function selectCorridor(idx) {
  if (!hotspotsData || !hotspotsData.features[idx]) return;

  // Deselect previous
  if (selectedCorridor !== null) {
    const prevCard = document.getElementById(`corridor-card-${selectedCorridor}`);
    if (prevCard) prevCard.classList.remove('active');
    if (corridorLayers[selectedCorridor]) {
      corridorLayers[selectedCorridor].setStyle({ weight: 4, opacity: 0.7 });
    }
  }

  // Select new
  selectedCorridor = idx;
  const card = document.getElementById(`corridor-card-${idx}`);
  if (card) card.classList.add('active');
  if (corridorLayers[idx]) {
    corridorLayers[idx].setStyle({ weight: 6, opacity: 1 });
  }

  // Pan to corridor
  const feature = hotspotsData.features[idx];
  const coordinates = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  if (coordinates.length > 0) {
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
  }
}

function getColorByRank(rank) {
  switch(rank) {
    case 1:
    case 2:
      return '#ba3535'; // severity-fatal (dark red)
    case 3:
    case 4:
      return '#ff5a00'; // severity-major (orange)
    case 5:
      return '#9c7a16'; // severity-minor (gold)
    default:
      return '#505050'; // gray
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initMap);
