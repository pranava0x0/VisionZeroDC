# 30-Day Action Plan: Get the Ball Rolling

> Tactical checklist for jumpstarting the implementation roadmap. Assign owners, set weekly milestones, track progress.

---

## Week 1: Secure Buy-In & Launch Data Work

### Monday–Tuesday (Days 1–2)

**Executive Alignment Meeting**
- [ ] Schedule 1-hour meeting: DDOT director, MPD commander, DoE representative, Council staffer
- **Agenda**: Share research findings; confirm priorities (protected intersections + crossing guards + evaluation framework)
- **Deliverable**: Written agreement on Phase 1 scope + budget authority
- **Owner**: [DDOT leadership]
- **Slides to use**: HOTSPOTS_AND_POLICIES.md summary + NEXT_STEPS_SUMMARY.md

**Press Release / Announcement** *(Optional but recommended)*
- [ ] Draft 1-page statement: "DDOT commits to evidence-backed Vision Zero: crossing guards in all schools, protected intersections on top crash corridors"
- **Tone**: Action-oriented, equity-focused, community-led
- **Distribution**: Council members, community boards, media
- **Owner**: [DDOT public affairs]

### Wednesday–Thursday (Days 3–4)

**Start Data Requests**
- [ ] Send formal data request to DDOT data team:
  - *Speed camera tickets by location, monthly, 2024–2026*
  - *Moving violations by location/time from MPD (if available)*
  - *Crash data with intersection-level precision (use NEARESTINTSTREETNAME field)*
  
- [ ] CC: Communications lead so they know why we need it (for dashboard, evaluation, equity audit)
- **Timeline**: Ask for 2-week turnaround
- **Owner**: [Data team lead]

**Evaluation Partner Outreach**
- [ ] Identify 2–3 universities or consulting firms for evaluation framework work:
  - **Preferred**: GWU (nearby), Johns Hopkins (epidemiology), Howard (HBCU partnership)
  - **Alternative**: Academic hospital, nonprofit research org
  
- [ ] Send introductory email with:
  - HOTSPOTS_AND_POLICIES.md + IMPLEMENTATION_ROADMAP.md
  - "Scope: 8-week framework for Vision Zero evaluation (before/after metrics, statistical approach)"
  - "Budget: $30–50K"
  - "Timeline: Start immediately, deliver by [date 8 weeks out]"
  
- [ ] Ask for 1-pager with approach + team credentials by end of week
- **Owner**: [Project manager]

### Friday (Day 5)

**Crossing-Guard Recruitment Outreach**
- [ ] Email 5–10 community organizations in Wards 7, 8:
  - DC Collaborative, Bread for the City, Boys & Girls Club, local ANCs, church networks
  - Subject: "Partner with DDOT on School Safety: Crossing Guard Recruitment, $25/hr"
  - Attachments: Job description (draft), timeline, commitment letter
  
- [ ] Schedule 30-min calls with 3–5 top candidates to gauge interest + capacity
- **Owner**: [Community engagement lead]

**Hotspot Mapping Kickoff**
- [ ] Schedule meeting with DDOT GIS team + data analyst
- **Agenda**: How to query intersection-level crash data; process for geocoding verification
- **Deliverable**: Tentative hotspot list (top 20 intersections) by end of week
- **Owner**: [GIS/data team]

---

## Week 2: Reports, Outreach, Community Input

### Monday–Tuesday (Days 8–9)

**Evaluation Partner Selection**
- [ ] Review partner proposals (due end of Week 1)
- [ ] Select top choice; negotiate contract
- [ ] Kick-off call: Confirm scope, timeline, deliverables, team roles
- **Owner**: [Project manager + DDOT leadership]

**Protected Intersection Steering Committee**
- [ ] Convene first meeting: DDOT design lead, civil engineer (contractor), community reps, DDOT traffic, MPD
- **Agenda**:
  - Review 5 priority corridors (New York Ave NE, South Capitol St, etc.)
  - Rank 4–6 intersections for Phase 1 design
  - Confirm design & permitting timeline
  - Identify funding sources (FHWA, local, foundation)
  
- **Deliverable**: Ranked list of priority intersections; design RFP template drafted
- **Owner**: [DDOT design lead]

### Wednesday–Thursday (Days 10–11)

**Community Engagement Begins**
- [ ] Schedule ANC briefings (Ward 7D, 7E, 8B, 8C for South Capitol St; Ward 5 for New York Ave)
- **Presentation**: Hotspot data, proposed protected intersections, crossing-guard pilot, evaluation plan
- **Ask**: Feedback, community concerns, local incidents to incorporate
- [ ] Confirm school attendance for crossing-guard info session (end of week)
- **Owner**: [Community engagement lead]

**Enforcement Data Dashboard Specification**
- [ ] Meet with DDOT data + IT teams
- **Deliverables**:
  - Data dictionary (all fields, definitions)
  - Dashboard wireframe (map + charts + filters)
  - Data pipeline architecture (refresh frequency, security, storage)
  - Estimated delivery: 10 weeks
  
- [ ] Assign dashboard developer (internal or contractor); confirm budget ($40–70K)
- **Owner**: [Data team lead]

### Friday (Day 12)

**Week 2 Checkpoint**
- [ ] Progress report on all 5 work streams:
  - ✓ Executive alignment & announcement
  - ✓ Data requests sent + hotspot list underway
  - ✓ Evaluation partner selected + kickoff scheduled
  - ✓ Protected intersection priority list ranked
  - ✓ Community ANC briefings scheduled
  - ✓ Crossing-guard recruitment in progress
  - ✓ Dashboard architecture drafted
  
- [ ] Any blockers? Escalate to DDOT director
- **Owner**: [Project manager]

---

## Week 3: Design Contracts & Community Co-Design Begins

### Monday–Tuesday (Days 15–16)

**Protected Intersection Design RFP**
- [ ] Finalize RFP (scope of work, deliverables, timeline, budget, contractor qualifications)
- [ ] Post on DC e-procurement system + share with known firms
- **Budget per intersection**: $150–300K design
- **Timeline**: 8-week design (4–6 intersections = ~$600K–1.8M total)
- **Owner**: [DDOT procurement]

**Hotspot Mapping Complete**
- [ ] GIS team finishes top 20 intersections with confidence scores
- [ ] Deliver GeoJSON file + baseline crash summary for each location
- [ ] Create draft map layer for visionzero.dc.gov
- **Owner**: [GIS/data team]

### Wednesday–Thursday (Days 17–18)

**Community Design Charrette #1 (New York Ave NE)**
- [ ] Host 2-hour workshop with 20–30 residents, businesses, school reps
- **Agenda**:
  - Show hotspot data (crashes, injuries, demographics)
  - Explain protected intersections (show videos from Seattle, NYC)
  - Gather feedback: safety concerns, existing good infrastructure, community assets
  - Brainstorm design ideas together
  
- [ ] Use facilitator (nonprofit partner or consultant)
- [ ] Document feedback; photo/record for report
- **Owner**: [Community engagement lead]

**School Crossing-Guard Info Session**
- [ ] Host evening event at 1–2 pilot schools (Wards 7, 8)
- **Agenda**:
  - Explain crossing-guard role (safety, hours, pay, training)
  - Announce recruitment timeline
  - Collect interest forms from interested residents
  
- [ ] Coordinate with school principals + community orgs
- **Owner**: [Crossing-guard program lead]

### Friday (Day 19)

**Baseline Data Collection Planning**
- [ ] Evaluation team + DDOT meet to finalize baseline plan:
  - Which corridors/intersections to measure? (Recommend: 4–6 protected intersection sites + 5–10 control sites)
  - What data to collect? (Crashes, speeds, pedestrian volumes, behavioral observations)
  - Who collects it? (DDOT staff, contractors, volunteers)
  - Timeline? (Start immediately for pre-intervention baseline)
  
- [ ] Order equipment if needed (speed radar, traffic counters, survey tablets)
- **Owner**: [Evaluation team]

---

## Week 4: Staffing, Approvals, Momentum Building

### Monday–Tuesday (Days 22–23)

**Crossing-Guard Program Staffing**
- [ ] Hire crossing-guard program coordinator (1 FTE, ~$65K salary)
- **Responsibilities**: Recruitment, training, scheduling, compliance, community liaison
- [ ] Finalize job description, post, review candidates
- **Target start date**: End of Week 4 or early Week 5
- **Owner**: [DDOT HR + Crossing-guard lead]

**Evaluation Framework Delivery**
- [ ] University partner delivers draft evaluation framework (Week 8 deliverable if started Week 1)
- [ ] Circulate to DDOT, MPD, council staff for review
- [ ] Schedule 1-hour feedback call
- **Owner**: [Evaluation team]

### Wednesday–Thursday (Days 24–25)

**Community Design Charrette #2 (South Capitol St)**
- [ ] Repeat charrette format for South Capitol St corridor
- [ ] Include Wards 6, 7, 8 residents + businesses
- **Owner**: [Community engagement lead]

**Dashboard Progress Update**
- [ ] Data team finishes data pipeline; initial dashboard prototype ready
- [ ] Test with dummy data to confirm functionality
- [ ] Share prototype with DDOT leadership + community rep for feedback
- **Owner**: [Data/IT team]

### Friday (Day 26)

**Crossing-Guard Recruitment Blitz**
- [ ] Launch social media + email campaign in Wards 7, 8
- [ ] Host 1–2 recruitment events (library, community center, church)
- **Message**: "We're hiring crossing guards! $25/hr, flexible schedule, protect your community"
- [ ] Community org partners help recruit
- **Target**: 20–30 applications for 5–10 pilot schools by end of month
- **Owner**: [Crossing-guard lead + community orgs]

---

## Week 5: Approvals & Momentum

### Monday–Tuesday (Days 29–30)

**Hotspot Publication**
- [ ] Publish hotspot map on visionzero.dc.gov (beta launch)
- [ ] Announce on social media: "See where the crashes are. Help us fix them."
- [ ] Include link to community feedback form
- **Owner**: [Web team]

**30-Day Report**
- [ ] Compile progress across all 5 work streams
- **Headline metrics**:
  - ✓ Executive alignment secured + funding approved
  - ✓ Data requests submitted + evaluation partner hired
  - ✓ 20 hotspots mapped + published
  - ✓ 2 community design charrettes completed
  - ✓ Crossing-guard program staffing underway; 20+ applications
  - ✓ Protected intersection RFP issued
  - ✓ Dashboard prototype in review
  
- [ ] Present to DDOT director + council leadership
- [ ] Share progress on visionzero.dc.gov/news
- **Owner**: [Project manager]

---

## Success Checklist (By End of Day 30)

### Governance & Leadership
- [ ] Executive alignment meeting held + written agreement signed
- [ ] DDOT director + council leadership briefed on progress
- [ ] Steering committee established (protected intersections)
- [ ] Community engagement plan finalized + ANC briefings underway

### Data & Analysis
- [ ] Data requests sent to DDOT + MPD
- [ ] GIS hotspot mapping complete; 20 intersections ranked
- [ ] Hotspot map published on website
- [ ] Evaluation partner hired + kickoff completed
- [ ] Baseline data collection plan finalized
- [ ] Dashboard prototype in development; 10+ weeks of work ahead

### Community & Staffing
- [ ] 2 community design charrettes held (charrettes #3–5 in pipeline)
- [ ] ANC briefings underway; feedback documented
- [ ] Crossing-guard program coordinator hired/hired
- [ ] 20–30 crossing-guard applications received
- [ ] 1–2 school info sessions held
- [ ] Recruitment social media campaign launched

### Protected Intersections
- [ ] Priority intersections ranked (4–6 selected)
- [ ] RFP for design services issued + contractors notified
- [ ] Design steering committee 1st meeting held; scope confirmed

### Communication & Political Support
- [ ] Press release issued announcing Vision Zero commitment
- [ ] Council briefing scheduled + council members updated
- [ ] Community partners engaged (nonprofits, ANCs, schools)
- [ ] 30-day progress report published + shared

---

## Who Owns What (30-Day Teams)

### DDOT (Lead)
- **Project manager** (1 FTE): Overall coordination, reporting, escalation
- **Design lead** (existing staff): Protected intersection steering, contractor oversight
- **Data/GIS analyst** (existing staff): Hotspot mapping, dashboard backend
- **Community engagement** (1 new hire): ANC briefings, charrettes, feedback collection
- **IT/web team** (existing staff): Dashboard frontend, website updates

### DC Department of Education
- **School safety coordinator** (existing staff): School engagement, crossing-guard partnership

### Community Organizations
- **3–5 partner nonprofits** (existing staff): Crossing-guard recruitment, community charrettes, outreach
- **ANC representatives** (volunteer): Briefings, feedback, community liaison

### External Partners
- **University evaluation team** (consultant): Evaluation framework, baseline metrics, study design
- **Design/engineering firm** (contractor): Protected intersection design RFP responses
- **Dashboard developer** (contractor or DDOT IT): Dashboard build

---

## Resource Needs (30-Day Budget)

| Item | Cost | Notes |
|---|---|---|
| Evaluation partner (8 weeks) | $7.5K (1st month) | $30–50K total |
| Dashboard developer (initial setup) | $5K (1st month) | $40–70K total |
| Community engagement contractor | $5K (1st month) | Charrettes, facilitation |
| Crossing-guard program coordinator (salary) | $5K (1st month) | $65K annual |
| Design RFP / contractor startup | $5K | RFP development |
| Equipment (speed counters, surveys) | $2–3K | Baseline data collection |
| Marketing / social media | $1K | Recruitment, announcement |
| Contingency (10%) | $3K | — |
| **TOTAL (Month 1)** | **~$35K** | — |

---

## Escalation Path

If blocked or delayed:

1. **Data requests delayed?** → Escalate to DDOT director (data governance)
2. **Evaluation partner not selected?** → Escalate to council staffer (find alternate funding source)
3. **Community resistance to protected intersections?** → More design charrettes + show videos from peer cities
4. **Crossing-guard recruitment stalling?** → Increase pay, partner with more nonprofits, highlight equity narrative
5. **Budget not approved?** → Package Phase 1 as pilot ($200–300K request) vs. full 9-month roadmap

---

## Communication Cadence

- **Weekly** (internal): Monday 10am, 30-min standup (DDOT team + council liaison)
- **Bi-weekly** (steering committee): Protected intersections team
- **Monthly** (public): Progress report + blog post on visionzero.dc.gov
- **As-needed** (community): ANC briefings, school info sessions, charrettes

---

## Success Looks Like (Day 30)

- **Team is hired and meeting weekly**
- **Data requests are in transit; first datasets arriving**
- **Evaluation framework is being reviewed; baseline plan is set**
- **Community knows what's coming; 2–3 charrettes have happened**
- **Crossing-guard recruitment is underway; applications coming in**
- **Protected intersection designs are out for bid**
- **Public knows through website, social media, council testimony**
- **No major blockers; momentum is building**

---

**Owner**: DDOT Vision Zero Program Manager  
**Status**: Ready to launch  
**Next review**: End of Day 30 (or weekly standups)
