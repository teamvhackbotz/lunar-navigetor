# Component: AI Assistant — "Dr. Raj, Ph.D. Astrophysicist"

## 1. Overview & Role
**"Dr. Raj, Ph.D. Astrophysicist"** is an intelligent conversational agent situated in a collapsible floating widget in the lower corner of the interface. Dr. Raj fulfills NASA's objective of *Accessibility across skill levels* by offering two distinct modes:
1. **Mission Planning Copilot:** Translates complex telemetry and occlusion numbers into plain-language mission recommendations for engineers.
2. **Interactive Lunar Science Tutor:** Answers questions from students and the public about the Moon, orbital mechanics, craters, and Apollo/Artemis history.

---

## 2. Key Features & Specifications

### A. Collapsible Chat Interface
- **Floating Button / Avatar:** A modern collapsible circular avatar badge in the corner that expands into an interactive chat card on click.
- **Minimize / Expand Toggle:** Can be minimized at any time so it never blocks the 3D globe or timeline scrubber.
- **Context Awareness:** Dr. Raj automatically receives the active scenario state (selected landing sites, current timestamp, solar elevation, and comms status) so users don't need to manually re-type coordinates.

### B. Suggested Quick Prompts (Chips)
To make interaction immediate without typing, Dr. Raj presents clickable chips:
- *"Why is the Sun so low at the South Pole?"*
- *"Compare the solar illumination between my selected sites."*
- *"Will Earth set below the horizon during this landing window?"*
- *"What is lunar libration and why does it matter?"*
- *"Is the slope at this site safe for a lunar lander?"*

### C. Backend Architecture (FastAPI)
- Served via an asynchronous endpoint (`/api/dr-raj/chat`) in FastAPI.
- Connected to an LLM provider or contextual rule-based prompt engine tailored with lunar physics, LOLA data context, and mission planning knowledge.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member G / Backend Developer]
- **Key Files:** `static/js/components/dr_raj.js`, `static/css/dr_raj.css`, `backend/routes/ai_raj.py`
- **Events to Listen to:**
  - `site:selected`: Update Dr. Raj's active context with current site coordinates and terrain data.
  - `time:changed`: Update context with current solar/Earth elevation.
- **Events to Emit:**
  - `site:suggested`: Can suggest a landing site that automatically adds a card or focuses the camera.
