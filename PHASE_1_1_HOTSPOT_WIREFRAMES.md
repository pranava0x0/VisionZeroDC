# Phase 1.1: Hotspot Verification & Mapping
## Wireframes & Design Specifications

**Phase**: Foundation (Weeks 1-4)  
**Budget**: $5-10K  
**Deliverable**: Interactive hotspot map with GeoJSON data layer  
**Timeline**: 4 weeks  

---

## Design Question 1: Map Integration

### **Option A: Embedded in Existing map.html (RECOMMENDED)**
- Add hotspot layer as toggle in current crash map
- Reuses Leaflet infrastructure already in place
- Users can compare hotspots ↔ individual crashes
- **Pros**: Unified experience, reduces clicks
- **Cons**: Map page gets more complex

### **Option B: Standalone "Hotspots" Page**
- New page at `/hotspots.html`
- Dedicated focus on corridors/intersections
- Can be more detailed (corridor profiles, before/after, project status)
- **Pros**: Focused UX, SEO-able
- **Cons**: More navigation required

### **Option C: Landing Page Section**
- Add "Top Hotspots" carousel on index.html home tab
- Shows 5 priority corridors with links to map
- **Pros**: Gets visibility immediately
- **Cons**: Limited detail

---

## Recommendation
**Option A (Embedded) + Option C (Landing section)**
- Add carousel/teaser on home tab showing 5 corridors
- Click-through goes to map with hotspot layer active
- Hotspots queryable as a filter like existing severity/mode filters

---

## Design Question 2: Hotspot Visualization Style

### **Option 1: Circle Markers (Simple)**
```
Interactive circles on map
- Size = severity (# KSI)
- Color = mode (pedestrian=red, cyclist=green, vehicle=blue)
- Click → show corridor profile card
```
**Pros**: Clean, minimal, fast rendering  
**Cons**: Less detailed, harder to show corridor data

### **Option 2: Polyline Corridors (Recommended)**
```
Draw actual street corridors as polylines
- Color = severity gradient (darkest red = highest KSI)
- Thickness = crash count/density
- Hover → show summary (427 injuries, 2 deaths, New York Ave NE)
- Click → expand corridor profile
```
**Pros**: Shows actual street geography, matches policy intent  
**Cons**: Needs corridor geometry data

### **Option 3: Heat Map (Data-Intensive)**
```
Gradient heat map of crash density
- Warmer colors = higher concentration
- Hexbin aggregation for performance
```
**Pros**: Shows patterns/clusters clearly  
**Cons**: Less precise, harder to identify specific corridors

---

## Recommendation
**Option 2 (Polyline Corridors)**
- Most useful for planning (planners think in corridors, not point clusters)
- Visually distinct from individual crash points
- Aligns with "High Injury Network" concept in CLAUDE.md

---

## Wireframe: Interactive Map Integration

```
┌─────────────────────────────────────────────────┐
│  Vision Zero DC — Crash Map                     │
├─────────────────────────────────────────────────┤
│ [Filters] Severity | Mode | [NEW] Hotspots ↓    │
│ ───────────────────────────────────────────────  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  MAP VIEW (Leaflet)                      │   │
│  │  ────────────────────────────────────── │   │
│  │                                          │   │
│  │  🔴 DARK RED POLYLINES = Top 5 Corridors│   │
│  │  (New York Ave NE, South Capitol, etc) │   │
│  │                                          │   │
│  │  ⚫ Small dots = Individual crashes      │   │
│  │  (existing, may be hidden when zoomed)  │   │
│  │                                          │   │
│  │  [Hover corridor] → tooltip:            │   │
│  │  "New York Ave NE: 427 injuries, 2 deaths"  │
│  │                                          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
├─────────────────────────────────────────────────┤
│ [Click corridor to expand →]                    │
└─────────────────────────────────────────────────┘
```

---

## Wireframe: Corridor Profile Card (On-Click)

```
┌──────────────────────────────────────────────┐
│ NEW YORK AVENUE NE (4th St → Bladensburg Rd) │
├──────────────────────────────────────────────┤
│                                              │
│ SEVERITY SNAPSHOT (2022–2026)                │
│ ├─ 427 injuries                              │
│ ├─ 2 fatalities                              │
│ ├─ 118 total crashes                         │
│ └─ Trend: ↑ increasing                       │
│                                              │
│ BY MODE                                      │
│ ├─ Pedestrians: 45 KSI (30% of total)        │
│ ├─ Drivers: 60 KSI (40%)                     │
│ ├─ Cyclists: 20 KSI (13%)                    │
│ └─ Passengers: 20 KSI (13%)                  │
│                                              │
│ CRASH TYPES                                  │
│ ├─ Turning conflicts: 32%                    │
│ ├─ Speed-related: 28%                        │
│ ├─ Rear-end: 18%                             │
│ └─ Other: 22%                                │
│                                              │
│ RECOMMENDED INTERVENTIONS                    │
│ ├─ 🔵 Road diet (lane rechannelization)      │
│ ├─ 🔵 Protected intersections (4–6 sites)    │
│ ├─ 🟡 Automated speed enforcement            │
│ └─ 🟢 Leading pedestrian intervals           │
│                                              │
│ CONFIDENCE: Medium ••○                        │
│ Data sources: Crashes in DC (Open Data DC)   │
│ Last updated: 2026-06-07                     │
│                                              │
│ [VIEW FULL ANALYSIS] [VIEW ON MAP]           │
└──────────────────────────────────────────────┘
```

---

## Wireframe: Landing Page Teaser (Home Tab)

```
┌──────────────────────────────────────────────────┐
│ TOP 5 CRASH HOTSPOTS                             │
│ Evidence-backed corridors for intervention       │
├──────────────────────────────────────────────────┤
│                                                  │
│  [←] 1. NEW YORK AVE NE              427 KSI [→] │
│      4th St → Bladensburg Rd                    │
│      Road diet • Protected intersections        │
│                                                  │
│      2. SOUTH CAPITOL ST              427 KSI    │
│         Southern Ave → MLK Blvd                 │
│         Equity priority (Wards 7, 8)            │
│                                                  │
│      3. GEORGIA AVE NW                [tap] →   │
│         Multi-modal corridor                    │
│                                                  │
│  [View all 5 on the interactive map →]          │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Data Structure: Hotspots GeoJSON

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "name": "DC Vision Zero High-Injury Corridors",
    "source": "Crashes in DC + DDOT High Injury Network",
    "captured_at": "2026-06-07",
    "caveats": "Ward-grain analysis. Exact intersections in active planning phase."
  },
  "features": [
    {
      "id": "corridor_001",
      "type": "Feature",
      "properties": {
        "corridor_name": "New York Avenue NE",
        "location_scope": "4th Street NE to Bladensburg Road NE",
        "rank": 1,
        "severity": {
          "total_crashes_3yr": 118,
          "fatalities": 2,
          "major_injuries": 145,
          "minor_injuries": 280,
          "ksi": 147
        },
        "by_mode": {
          "pedestrian_ksi": 45,
          "cyclist_ksi": 20,
          "driver_ksi": 60,
          "passenger_ksi": 22
        },
        "crash_types": {
          "turning_conflicts": 0.32,
          "speed_related": 0.28,
          "rear_end": 0.18,
          "other": 0.22
        },
        "confidence": "medium",
        "recommended_interventions": [
          "road_diet",
          "protected_intersection",
          "automated_speed_camera",
          "leading_pedestrian_interval"
        ],
        "equity_notes": "High-speed arterial; mixed-income corridor; pedestrian exposure high",
        "source_url": "https://opendata.dc.gov/datasets/DCGIS::crashes-in-dc",
        "last_updated": "2026-06-07"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-77.0318, 38.9105],
          [-77.0314, 38.9115],
          [-77.0310, 38.9125],
          ...
        ]
      }
    },
    {
      "id": "corridor_002",
      "type": "Feature",
      "properties": {
        "corridor_name": "South Capitol Street",
        "location_scope": "Southern Avenue SE to MLK Boulevard SE",
        "rank": 2,
        ...
      },
      "geometry": { "type": "LineString", "coordinates": [...] }
    }
  ]
}
```

---

## Implementation Plan

### **Week 1: Data Preparation**
- [ ] Extract corridor coordinates from crash data (latitude/longitude pairs)
- [ ] Aggregate crashes by corridor (group nearby crashes)
- [ ] Calculate severity metrics (KSI, crash counts, mode breakdown)
- [ ] Create GeoJSON feature collection

### **Week 2: Map Layer Development**
- [ ] Add hotspot toggle to map.html filter controls
- [ ] Render GeoJSON polylines on Leaflet map
- [ ] Color/thickness styling based on severity
- [ ] Hover tooltip showing corridor summary

### **Week 3: Profile Card & Interactivity**
- [ ] Build corridor profile card component (HTML/CSS/JS)
- [ ] Click → expand card with detailed metrics
- [ ] "View on map" → zoom to corridor
- [ ] Link to recommended interventions

### **Week 4: Landing Page Integration & Testing**
- [ ] Add hotspot carousel/teaser to index.html home tab
- [ ] Accessibility review (keyboard nav, screen readers)
- [ ] Mobile responsiveness (map touchable, cards readable)
- [ ] Documentation + GeoJSON validation

---

## Questions for You

### **Design Choice 1: Which map integration?**
- [ ] **Option A** (embedded in existing map.html) + **Option C** (teaser on home)
- [ ] **Option B** (standalone /hotspots.html page)
- [ ] Other preference?

### **Design Choice 2: Visualization style?**
- [ ] **Option 2** (polyline corridors — recommended)
- [ ] **Option 1** (circle markers)
- [ ] **Option 3** (heat map)
- [ ] Mix of the above?

### **Design Choice 3: Data source?**
- [ ] Use **existing crash-summary.json** (we already have it, realistic sample data)
- [ ] **Query Open Data DC API** live (realistic, but slower build)
- [ ] **Create synthetic test data** (fastest development)

### **Design Choice 4: Level of detail in corridor profiles?**
- [ ] **Minimal** (name, injury count, recommended fixes)
- [ ] **Detailed** (all metrics shown above + before/after comparisons, project status)
- [ ] **Expandable** (minimal by default, click to expand for details)

---

## Success Criteria (Week 4 Checkpoint)

✅ Hotspot map renders on map.html with 5 priority corridors  
✅ Clicking a corridor shows profile card with metrics  
✅ Mobile-responsive (readable on 375px width)  
✅ Home tab shows teaser carousel linking to map  
✅ GeoJSON data is validated and documented  
✅ No console errors; performance acceptable (< 2s load time)  

---

**Ready for your design approval?** Let me know your answers to the 4 design choices above, and I'll move to implementation! 🎨
