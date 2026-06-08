# Implementation Roadmap: Next Steps & Ideas

> Detailed action plan for deploying the policy recommendations and research findings from 2026-06-07 research session.

---

## Phase 1: Foundation (Months 1–3)

### 1. Verify & Map Hotspot Coordinates

**Goal**: Confirm crash hotspot locations against authoritative sources; publish interactive map of top priority intersections.

**Current state**: Hotspots identified at ward/corridor grain; need intersection-level precision.

**Action items**:
- [ ] Query Open Data DC crashes API for intersection-level geocoding (NEARESTINTSTREETNAME field)
- [ ] Cross-reference New York Ave NE, South Capitol St top clusters with DDOT internal data
- [ ] Request community incident reports from Ward 7/8 ANCs (ANC 7D, 7E, 8B, 8C, 8D)
- [ ] Geocode any near-miss incidents (scanned from police/community reports) not in official crash data
- [ ] Create GeoJSON layer of verified intersections for map.html
- [ ] Document confidence score (official crash data vs. community report) for each location

**Deliverables**:
- GeoJSON file with top 20 intersections, severity, mode breakdown, confidence
- Interactive map layer showing verified hotspots on existing crash map
- Brief memo on data sources and confidence methodology

**Owner**: Data team (pipeline/)  
**Timeline**: 4 weeks  
**Effort**: Medium (API queries + GIS join + community outreach)  
**Cost**: ~$5–10K (community liaison time)

**Success metric**: All 5 corridors mapped to specific intersections with 80%+ confidence in location.

---

### 2. Establish Before/After Evaluation Framework

**Goal**: Define metrics, baseline, and evaluation protocol BEFORE deploying interventions so we can measure impact rigorously.

**Current state**: Recommendations exist; no structured evaluation design.

**Action items**:

#### 2a. Define Core Metrics
- [ ] **Crash metrics**:
  - Total crashes (by severity: fatal, major injury, minor injury, property-only)
  - KSI (killed or seriously injured) count
  - Crash rate per traffic volume (AADT) or population
  - Mode-specific crashes (pedestrian-involved, bicycle-involved, vehicle-vehicle)
  
- [ ] **Safety culture metrics**:
  - Vehicle speed distribution (85th percentile speed, mean speed)
  - Pedestrian crossing compliance (red-light running, jaywalking frequency)
  - Driver turning behavior (yield-to-pedestrian rate at intersections)
  
- [ ] **Equity & access metrics**:
  - School enrollment near corridor
  - Senior density (65+) near corridor
  - Low-income household density (% below 200% poverty line)
  - Racial/ethnic composition (monitor for disproportionate burden)
  
- [ ] **Public health metrics**:
  - Emergency department visits for traffic injury (by address/zipcode)
  - Traffic injury hospitalization rate
  - Post-intervention health outcomes (surveyable 6–12 months post)

#### 2b. Baseline Data Collection
- [ ] Pull 3 years of historical crash data (pre-intervention window)
- [ ] Install temporary speed cameras/radar on target corridors to establish baseline speed distribution
- [ ] Conduct pedestrian/driver behavior observations at top 3 intersections per corridor (4-hour periods, multiple times of day)
- [ ] Survey residents/workers on perception of safety (before intervention)
- [ ] Document existing infrastructure (photos, geometry, signal timing)

#### 2c. Evaluation Design Document
- [ ] Control/comparison group selection (similar corridors without intervention)
- [ ] Time window for measurement (recommend: 12 months pre, 24 months post for crash data maturation)
- [ ] Statistical methods (difference-in-differences, interrupted time series, regression discontinuity)
- [ ] Confounding variable adjustment (weather, gas prices/travel demand, police enforcement cycles, school calendar)
- [ ] Disaggregation plan (by mode, by demographic area, by time of day/day of week)

**Deliverables**:
- "Evaluation Framework for DC Vision Zero Interventions" document (~20–30 pages)
- Baseline data collection spreadsheet/database schema
- Pre-intervention photography and video repository
- Statistical analysis plan (to be finalized with epidemiologist/statistician)

**Owner**: Evaluation team (in partnership with GWU, Johns Hopkins, or local university)  
**Timeline**: 8 weeks  
**Effort**: High (requires statistical expertise, community input)  
**Cost**: $30–50K (university partnership or consultant)

**Success metric**: Framework approved by DDOT, MPD, and at least one independent academic reviewer before first intervention deployment.

---

### 3. Publish Enforcement Data Dashboard

**Goal**: Transparently share speed-camera tickets and moving violations data by location/time/demographics to enable equity audit and community accountability.

**Current state**: Data exists but not publicly disaggregated; DDOT publishes aggregate figures, not location-level.

**Action items**:

#### 3a. Data Preparation
- [ ] Request from DDOT: monthly speed-camera ticket counts by camera location (2024–2026)
- [ ] Request from MPD: moving violations dataset with:
  - Citation location (intersection or block)
  - Violation type (speeding, reckless driving, etc.)
  - Fine amount
  - Date/time of day
  - If available: driver race/ethnicity, vehicle type
  
- [ ] Aggregate by camera/location + month + violation type
- [ ] De-identify individual driver/vehicle data; publish counts only
- [ ] Cross-reference locations to ward + ANC + school proximity

#### 3b. Dashboard UI
- [ ] Interactive map showing all camera locations + monthly ticket counts
- [ ] Time-series chart of tickets by location (trend over 24+ months)
- [ ] Comparison view: tickets vs. nearby crash history + population demographics
- [ ] Filter controls:
  - By ward / ANC / neighborhood
  - By violation type (speed, moving, other)
  - By date range
  - By school zone (Y/N)
  
- [ ] Disparity indicators:
  - Ticket density per capita by race/income (if disaggregated data available)
  - Comparison: HIN corridors vs. non-HIN corridors
  - Enforcement frequency per reported collision

#### 3c. Documentation
- [ ] Data dictionary (define all fields, note limitations)
- [ ] Methodology memo: how tickets are counted, what's excluded, data freshness
- [ ] Limitations & caveats (e.g., "does not include written/verbal warnings", "may miss some tickets if reported under different location name")
- [ ] Call-to-action: "See a discrepancy? Report it here" (community feedback mechanism)

**Deliverables**:
- Public dashboard at visionzero.dc.gov/enforcement-data (or embedded in landing page)
- Downloadable CSV exports for researchers
- Monthly update automation (scheduled data refresh)
- Community reporting form (email + web form)

**Owner**: Data / GIS team + DDOT public affairs  
**Timeline**: 10 weeks (includes DDOT data request + stakeholder review)  
**Effort**: High (requires DDOT coordination, dashboard development)  
**Cost**: $40–70K (contractor for dashboard dev + DDOT staff time)

**Success metric**: Dashboard live and updated monthly; at least 500 unique visitors in first month; at least one news article or community org shares it.

**Equity angle**: Monitor ticket distribution for racial/income disparities. If found, surface in dashboard summary and recommend policy adjustment (e.g., shift from enforcement-heavy to engineering-led on disproportionate corridors).

---

## Phase 2: School-Zone Crossing-Guard Expansion (Months 2–4)

### 4. Launch Crossing-Guard Program Pilot

**Goal**: Close the 59% school-zone crossing-guard gap in DC; prioritize Wards 7, 8, and other high-crash-burden neighborhoods.

**Current state**: 41% of DC schools have crossing guards; gaps in historically disinvested areas.

**Action items**:

#### 4a. Inventory & Gap Assessment
- [ ] Query DC Department of Education for complete school roster (address, grade, enrollment)
- [ ] Cross-reference with DDOT/MPD crossing-guard assignments
- [ ] Identify:
  - Schools with NO crossing guard today
  - Schools with crossing guard but HIGH nearby crash history
  - Schools in Wards 7, 8, high-poverty areas
  - Elementary + middle schools (K–8 priority; high mortality risk for young children)
  
- [ ] Survey school administrators: Which unfunded intersections pose highest safety concern?

#### 4b. Pilot Selection
- [ ] Select 5–10 schools for Phase 1 (Wards 7, 8 prioritized)
- [ ] Criteria:
  - High student enrollment (100+ students)
  - ≥2 crash incidents within 1/4 mile in past 3 years
  - Elementary school (K–5)
  - Community support (documented in ANC minutes or petition)
  
- [ ] Confirm: Do intersections have pedestrian signals? If not, install simultaneously with guard program.

#### 4c. Staffing & Training
- [ ] Partner with community organizations (Ward 7/8 nonprofits, Boys & Girls Clubs) for crossing-guard recruitment
- [ ] Develop crossing-guard job description:
  - $25/hour (DC living wage minimum)
  - 2–3 hour shifts (peak morning + afternoon)
  - Full-time equivalent: ~0.5–1 FTE per school for 1 main crossing
  
- [ ] Training curriculum:
  - Pedestrian safety best practices
  - Communication with drivers
  - Incident reporting
  - Conflict de-escalation
  - CPR (optional; insurance requirement check)
  
- [ ] Partner with DDOT for official certification

#### 4d. Infrastructure Paired with Staffing
- [ ] At each guarded intersection, install:
  - High-visibility crosswalk markings (thermal plastic)
  - Curb extensions / bump-outs to shorten crossing distance
  - Leading pedestrian intervals (signal timing adjustment)
  - Optional: Rapid rectangular flashing beacon (RRFB) if high speeds or visibility issues
  
- [ ] Cost: $3–5K per intersection (add to crossing-guard budget)

#### 4e. Marketing & Community Engagement
- [ ] Create "Safe Routes to School" website with:
  - Map of guarded schools + routes
  - Tips for parents/students
  - Local success stories
  - Feedback form
  
- [ ] Host kickoff event at each pilot school (invite parents, community, local councilmembers)
- [ ] Partner with school PTA for ongoing volunteer support (non-paid but recognized)
- [ ] Media: DC Council press release + local news coverage

**Deliverables**:
- Pilot program plan document (scope, budget, timeline, evaluation)
- Job description + training materials
- "Safe Routes to School" website
- Baseline safety assessment for each pilot school (crashes, speeds, observed behavior)
- Community engagement plan + messaging

**Owner**: DDOT + DC Department of Education + Community partners  
**Timeline**: 12 weeks (recruitment + training before school year)  
**Effort**: Very high (coordination across agencies + hiring)  
**Cost**: $2–3M annually for full expansion (all 59% gap); Pilot: $150–200K (5–10 schools + infrastructure)

**Success metric**: 
- Pilot schools hired 100% of crossing guards by start of school year
- Parent perception of safety improves (survey pre/post)
- Observed vehicle speeds drop 2–3 mph at guarded intersections
- Zero near-misses at guarded locations in first year

**Political angle**: Frame as "equity investment in communities hit hardest by crashes" (Wards 7, 8 narrative). Seek Council co-sponsorship; tie to education equity + public health goals.

---

## Phase 3: Protected Intersections (Months 3–9)

### 5. Design & Permit Protected Intersections on New York Ave NE & South Capitol St

**Goal**: Deploy corner islands, setback crossings, and protected signal phases at 4–6 high-fatality intersections; reduce turning collisions by 50%+.

**Current state**: Corridors identified; detailed intersection design not started.

**Action items**:

#### 5a. Priority Intersection Selection
- [ ] For each corridor (New York Ave NE, South Capitol St), rank intersections by:
  - Fatalities + major injuries (3-year count)
  - Mode composition (pedestrian + cyclist share of crashes)
  - Turning-related crash rate (vs. rear-end or sideswipe)
  - Design feasibility (right-of-way, utilities, business impact)
  
- [ ] Select 2–3 per corridor for Phase 1 (4–6 intersections total)

#### 5b. Detailed Design Phase
- [ ] Contract civil engineering firm (or DDOT in-house design) for each intersection:
  - Survey + existing conditions (geometry, utilities, traffic volumes)
  - AutoCAD/GIS drawings of proposed design
  - Bill of materials (precast corner islands, curb extensions, signal equipment)
  - Traffic impact analysis (queue length, turning movements)
  - ADA/accessibility review (wheelchair crossing paths, audio signals)
  
- [ ] Design options:
  - **Standard protected intersection**: Setback crossings + corner islands + all-pedestrian signal phase (no simultaneous turns)
  - **Simplified version**: Curb extensions + leading pedestrian intervals (no full setback if ROW constrained)
  
- [ ] Utility coordination: Mark gas/water/electric/fiber lines; plan relocations if needed
- [ ] Cost per intersection: $150–300K design (varies by complexity)

#### 5c. Community Engagement & Permitting
- [ ] Hold 2–3 community meetings per intersection (design charrettes):
  - Present 2–3 design options
  - Show before/after renderings
  - Gather feedback on: corner activity spaces, bike parking, street trees, loading zones
  
- [ ] Incorporate feedback into final design
- [ ] File DDOT permits + ANC briefings
- [ ] Secure necessary easements (if extending into private property)

#### 5d. Cost Estimation & Funding Strategy
- [ ] Full cost per intersection: $600K–1.5M (design + construction + inspection)
- [ ] Funding sources:
  - DDOT Vision Zero budget (if allocated)
  - Federal: FHWA safety grants, USDOT competitive grants
  - Local: Council capital budget, Ward-specific discretionary
  - Foundation: Haley & Guillot, Humana Foundation, local community foundations
  - Public-private: Business improvement district (BID) match if on commercial corridor
  
- [ ] Timeline to funding decision: 3–6 months (grant writing, Council budget cycle)

#### 5e. Construction Phasing
- [ ] Each intersection: 3–6 month design-bid-build cycle
- [ ] Work with DDOT traffic management to minimize disruption
- [ ] Plan phasing to coordinate with:
  - Street repaving (bundle for cost savings)
  - Sewer/water maintenance (if needed)
  - Seasonal construction windows (avoid holidays, school events)

**Deliverables**:
- 30% design plans for each priority intersection
- Community engagement summary + design modifications
- ADA accessibility certification
- Cost estimate breakdown (materials, labor, inspection, contingency)
- Grant applications (if pursuing external funding)
- Project timeline + phasing plan

**Owner**: DDOT Design team + Community engagement  
**Timeline**: 6–9 months (design phase only; construction follows)  
**Effort**: Very high (multi-disciplinary coordination)  
**Cost**: $600K–1.8M per intersection (4–6 intersections = $2.4–10.8M total)

**Success metric**: 
- 4–6 protected intersections with final designs approved + funded by month 9
- Community support documented (80%+ approval in ANC vote)
- Construction start within 12 months of approval

**Equity messaging**: Frame South Capitol St as "critical to Ward 7/8 safety equity"; secure equity bonus funding if available.

---

## Phase 4: Sustained Deployment & Monitoring (Months 6–24+)

### 6. Implement Baseline Data Collection & Continuous Monitoring

**Goal**: Ensure all interventions (crossing guards, protected intersections, enforcement data) are measured against baselines and monitored for impact.

**Action items**:
- [ ] Install automated speed counters (pneumatic tubes or radar) on all priority corridors (monthly data)
- [ ] Subscribe to open data refreshes: check DC crash dataset monthly for new incidents near intervention sites
- [ ] Quarterly community surveys at pilot schools + near protected intersections (sample size: 50–100)
- [ ] 12-month post-implementation evaluation (vs. baseline): Do crashes decline? Do speeds drop? Do community surveys show improved safety perception?

**Deliverables**:
- Monthly speed + crash dashboard (internal tracking)
- Quarterly public progress report
- 12-month evaluation report for each intervention

**Cost**: $50–100K annually (data collection + analysis)

---

## Additional Expansion Ideas (Beyond Next 9 Months)

### 7. Rapid Build "Quick Wins" Program
**Idea**: Bundle low-cost, high-impact interventions (daylighting, curb extensions, painted bike lanes, LPI) onto annual repaving schedule.

**Why**: Compounds small safety gains citywide rather than waiting on large capital projects.

**Actions**:
- [ ] Map annual repaving schedule (DDOT does ~5–10 miles/year)
- [ ] Pre-screen repaving segments for quick-win opportunity (near schools, high-crash zones)
- [ ] Add $50–100K per mile for quick-win treatments (daylighting, extensions, signal timing)
- [ ] Pilot on 2–3 miles in Year 1 (Wards 7, 8 priority)

**Cost per mile**: Additional $50K–100K (marginal cost on top of repaving)  
**Reach**: Could cover 10–20 miles citywide within 5 years

---

### 8. Protected Bike Lane Expansion
**Idea**: Connect schools to transit + retail on Georgia Ave NW, 14th St N/S, H St NE using protected lanes.

**Why**: Addresses second-highest casualty mode; enables car-free school trips.

**Actions**:
- [ ] Choose 1 corridor for Phase 1 (suggest: Georgia Ave NW, high enrollment)
- [ ] Design 2–3 mile segment with protected lane + intersection treatments
- [ ] Secure 50% funding match from DC Department of Transportation + DC Department of Energy & Environment
- [ ] Pilot before full build; measure ridership + crash changes

**Cost**: $400K–600K per mile  
**Timeline**: 12–18 months design + build

---

### 9. Community Safety Leadership Program
**Idea**: Train residents in high-crash neighborhoods to advocate for their own street safety; empower them as Voice on Vision Zero Task Force.

**Why**: Solutions designed WITH communities, not FOR them, are more durable and equitable.

**Actions**:
- [ ] Recruit 20–30 residents from Wards 7, 8, East Capitol St corridor
- [ ] 8-week training on:
  - Traffic safety basics (speed, sight lines, vulnerable users)
  - How to read crash maps + data
  - Policy advocacy (council testimony, op-eds, social media)
  - Community organizing (petitions, events, fundraising)
  
- [ ] Support participants to:
  - Lead their own "Walk Audit" of top intersections (safety inventory)
  - Co-design interventions with DDOT (participatory design charrette)
  - Testify at Council on safety priorities
  - Monitor & report on implemented projects
  
- [ ] Create stipend: $500–1000/participant for time commitment

**Cost**: $50–100K (trainer + stipends + materials)  
**Timeline**: Recruitment (2 mo) + training (2 mo) + implementation (ongoing)

---

### 10. School-Adjacent Safe Parking & Deliveries Pilot
**Idea**: Designate loading zones near schools; restrict parent drop-off double-parking that blocks sight lines.

**Why**: Uncontrolled double-parking is a major crash factor at schools; drivers can't see pedestrians.

**Actions**:
- [ ] Audit 5 pilot schools: document parking/drop-off chaos, conflicts
- [ ] Design timed loading zone + parent drop-off corral
- [ ] Work with school + community to set hours (7–9am, 2–4pm peak)
- [ ] Install signage + street markings
- [ ] Monitor compliance (parking enforcement first month, then community volunteers)

**Cost**: $2–5K per school (signage + markings + initial enforcement)  
**Timeline**: 4–8 weeks per school

---

## Governance & Accountability

### Suggested Structure:
1. **Vision Zero Working Group** (monthly):
   - DDOT (leadership + design + data teams)
   - MPD (enforcement + traffic safety)
   - DC Department of Education (schools liaison)
   - Department of Health (injury prevention)
   - Community representatives (2–3 from high-burden wards)
   
2. **Sub-committees**:
   - **Design & Engineering**: protected intersections, complete streets
   - **Enforcement & Equity**: speed camera deployment, ticket disparity audit
   - **Schools & Community**: crossing guards, safe routes, resident leadership program
   - **Evaluation & Data**: baseline/after measurement, dashboard updates
   
3. **Public Dashboard** (online):
   - Live progress on all projects (% complete, budget, timeline)
   - Crash trend data (updated monthly)
   - Community feedback summary
   - Link to report issues: "See a safety problem? Tell us" form

---

## Budget Summary (9-Month Roadmap)

| Initiative | Cost | Timeline |
|---|---|---|
| Hotspot verification & mapping | $5–10K | 4 weeks |
| Evaluation framework | $30–50K | 8 weeks |
| Enforcement data dashboard | $40–70K | 10 weeks |
| School-zone crossing guards (pilot: 5–10 schools) | $150–200K | 12 weeks |
| Protected intersections (design: 4–6 intersections) | $600K–1.8M | 6–9 months |
| Baseline data collection & monitoring | $50–100K | Ongoing |
| **TOTAL PHASE 1–3** | **$875K–2.23M** | **6–9 months** |

---

## Success Metrics (12-Month Horizon)

| Goal | Metric | Target |
|---|---|---|
| **Equity** | Schools with crossing guards in Wards 7, 8 | 80%+ (from 41%) |
| **Safety** | KSI reduction on protected corridor intersections | 30%–50% year-over-year |
| **Speed** | Mean speed reduction on high-injury corridors | 3–5 mph |
| **Transparency** | Monthly enforcement data dashboard views | 1000+ unique visitors/month |
| **Community** | Resident satisfaction with safety (survey) | 70%+ "improved" or "much improved" |
| **Evaluation** | Baseline + 12-mo data for all interventions | 100% completeness |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DDOT data delays (enforcement, hotspots) | Medium | High | Start data requests NOW; have fallback: public aggregates only |
| Community opposition to cameras/enforcement | High | Medium | Lead with engineering fixes; position enforcement as *supporting*, not primary |
| Crossing-guard hiring/retention challenges | High | High | Partner with nonprofits early; offer benefits (health, training) not just wages |
| Protected intersection cost overruns | Medium | High | Fixed-price design-bid-build contracts; phased construction; public-private funding mix |
| Weather delays on construction | High | Low | Plan work Apr–Oct; contingency timeline buffer |
| Political leadership transition (new mayor/council) | Medium | High | Build broad coalition (schools, businesses, nonprofits); codify goals in legislation |

---

**Next immediate action**: Schedule kick-off meeting with DDOT, MPD, DoE, and community reps. Confirm Phase 1 (Months 1–3) ownership and timelines.
