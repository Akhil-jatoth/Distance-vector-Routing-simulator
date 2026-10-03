# Distance Vector Routing Simulator (RFC 1058 / RFC 2453)

An interactive, responsive web application and Progressive Web App (PWA) that demonstrates the inner workings of the **Distance Vector Routing Protocol** (RIP) using the **Bellman-Ford algorithm**, complete with a **Packet Tracer**, **DV vs Link State Race (Dijkstra)**, **Quiz Challenge Mode**, and **Scalability Analytics**.

Built with **React + Vite** and pure JavaScript for the simulation engines.

---

## 1. Key Features

- **Pure JavaScript Routing Engines:**
  - `src/engine/distanceVector.js`: Pure Bellman-Ford synchronous distance vector calculations, tie-breaking, Split Horizon & Poison Reverse ($\infty = 16$).
  - `src/engine/linkState.js`: Isolated Dijkstra Link-State engine for side-by-side race comparisons.
  - `src/engine/packetTracer.js`: Hop-by-hop packet forwarding with configurable TTL and live routing loop detection.
- **Interactive SVG Topology Builder:**
  - Starts on a clean blank canvas.
  - Quick-add routers (`R1, R2, R3...`) and drag them freely.
  - Connect router endpoints by clicking endpoint 1 then endpoint 2 with a dynamic elastic wire preview.
  - In-app custom confirmation popups for link/router deletions.
  - Crash/restore individual routers (drops all connected links together).
- **Tabbed Inspection Panel:**
  - **Routing Table:** Destination, Cost, Next Hop with live round change highlights.
  - **Calculation Breakdown & Kurose-Ross Matrix:** Detailed $c(x,v) + D_v(y)$ candidate evaluations and textbook distance table.
  - **Packet Tracer:** Send packets with custom TTL and view hop-by-hop forwarding and loop drop diagnostics.
  - **Event Log:** Searchable log with configurable visible event limits (10, 25, 50, 100, All).
  - **Path Finder:** Shortest path highlight on canvas.
- **Pages:**
  - **Home:** Overview and quick links to modules.
  - **Simulator:** Main interactive lab.
  - **Learn:** Theoretical formulas, RIP vs OSPF comparison table, Count-to-Infinity walkthrough.
  - **Quiz:** Engine-verified multiple-choice questions across Easy, Medium, and Hard difficulties with full explanations.
  - **Compare:** Distance Vector vs Link State race comparing message counts, convergence steps, and failure handling.
  - **Analytics:** Scalability experiment runner across 5, 10, 20, and 50 nodes, SVG convergence charts, CSV export, and printable report.
  - **About:** RFC specifications, team credits, and documentation.
- **User Aids & Sharing:**
  - Dark Mode toggle with persistent storage.
  - Share Scenario via URL state encoding and SVG QR code.
  - Interactive 5-step guided tutorial tour.
  - Keyboard shortcuts (`Space`, `N`, `B`, `R`, `?`).

---

## 2. Installation and Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Run automated unit tests
npm test

# 4. Build production bundle (output in dist/)
npm run build

# 5. Preview production build
npm run preview
```

---

## 3. 3-Minute Live Demo Script

1. **Build a Custom Topology (0:00 - 0:45):**
   - Open the Simulator page (starts on a blank canvas).
   - Click **`+ Add Router`** three times to spawn `R1`, `R2`, and `R3`. Drag them into a triangle layout.
   - Click **`+ Connect Routers`**, click `R1` then `R2` (set cost `1`). Click `R2` then `R3` (set cost `2`). Click `R1` then `R3` (set cost `5`).
2. **Step Through Convergence (0:45 - 1:15):**
   - Click **Next Round** (or press `N`). Point out that `R1` updates its route to `R3` via `R2` with cost `3` (improved from `5`).
   - Click **Next Round** again $\to$ Notice zero changes $\to$ Banner displays *"Converged after 2 rounds"*.
3. **Inspect Calculations & Matrix (1:15 - 1:45):**
   - Click the **Calculation & Matrix** tab to view the Kurose-Ross distance matrix and candidate breakdown:
     `c(R1,R2)[1] + D_R2(R3)[2] = 3`.
4. **Packet Tracer with TTL (1:45 - 2:15):**
   - Switch to the **Packet Tracer** tab.
   - Select Source `R1`, Destination `R3`, TTL `16`. Click **Send Packet**.
   - Show the hop table: $R1 \to R2 \to R3$ (Delivered, TTL remaining: 14).
5. **Simulate Failure & Compare Race (2:15 - 3:00):**
   - Click the cost badge on link `R2-R3` $\to$ click **"Fail Link"**.
   - Step forward to show $R1$ dynamically falling back to direct link $R1-R3$ (cost `5`).
   - Switch to the **Compare** page to demonstrate the DV vs Link State race on the same network.

---

## 4. Viva-Ready Q&A Reference

### Q1: What is the Bellman-Ford equation in Distance Vector routing?
> **Answer:** Each router $x$ calculates its minimum cost to destination $y$ by minimizing over all direct neighbors $v$:
> $$D_x(y) = \min_{v \in N(x)} \{ c(x, v) + D_v(y) \}$$

### Q2: Why does the Packet Tracer need a TTL (Time-To-Live)?
> **Answer:** During network transitions and link cuts, transient routing loops can form before the network converges. A TTL ensures packets do not circulate indefinitely by decrementing by 1 at each hop and dropping with a loop diagnosis when TTL reaches 0.

### Q3: How does Distance Vector differ from Link State in message overhead?
> **Answer:** Distance Vector exchanges distance vectors only between direct neighbors ($O(\text{edges})$ per round). Link State floods Link-State Advertisements (LSAs) across the entire autonomous system ($O(\text{nodes} \times \text{edges})$), giving every router a global topological map to run Dijkstra locally.

### Q4: How do Split Horizon and Poison Reverse terminate Count-to-Infinity?
> **Answer:**
> - **Split Horizon:** A router omits advertising a route back to the neighbor from which it learned that route.
> - **Poison Reverse:** A router explicitly advertises an unreachable cost of $16$ back to that neighbor, immediately invalidating the reverse path.

---

## 5. Deployment Instructions

- **Netlify:** Connect repo, set build command `npm run build`, publish directory `dist`.
- **Vercel:** Auto-detected as Vite project, deploy with default build settings.
- **GitHub Pages:** Set `base: './'` in `vite.config.js` (pre-configured), run `npm run build`, and push `dist/` to branch `gh-pages`.
>>>>>>> dd1231a (feat: complete Distance Vector Routing simulator with visual topology canvas and multi-platform mobile support)
