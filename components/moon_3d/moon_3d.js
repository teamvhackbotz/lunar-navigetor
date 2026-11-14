/**
 * ============================================================================
 * COMPONENT: Three.js 3D Moon Viewport (components/moon_3d/)
 * SCRIPT: moon_3d.js
 * 
 * ROLE:
 * Renders the primary interactive 3D WebGL lunar globe using Three.js:
 * - Spherical 3D Moon model with NASA LROC high-resolution albedo texture.
 * - OrbitControls for rotation, pitch, and zoom focusing on the South Pole.
 * - Dynamic solar illumination that orbits based on mission timeline progression.
 * - Raycaster click-to-pin system converting 3D ray intersections to lunar (lat, lon).
 * - Real-time surface pin marker with normal vector orientation to the sphere.
 * 
 * DATA FLOW & EVENTBUS INTEGRATION:
 * 📥 DATA IN (Listens to):
 *    - "site:marked"  -> Payload: { lat: number, lon: number, name: string }
 *                        Updates the 3D surface pin position and normal orientation.
 *    - "time:changed" -> Payload: { sliderValue: number (0-100), timeISO: string }
 *                        Orbits the directional sunlight around the lunar ecliptic plane
 *                        with a 1.54° axial tilt simulation.
 * 
 * 📤 DATA OUT (Emits):
 *    - "site:marked"  -> Payload: { lat: number, lon: number, name: string, source: "moon-3d" }
 *                        Fires when the user clicks anywhere on the 3D lunar surface.
 * ============================================================================
 */

(function() {
  // ==========================================================================
  // 1. SCENE STATE & CONSTANTS
  // ==========================================================================
  let scene, camera, renderer, controls;
  let moonMesh, sunLight;
  const pinsMap = new Map();
  let pinsContainer = null;
  
  // Standard WebGL world radius of the lunar sphere
  const MOON_RADIUS = 2.5;

  // ==========================================================================
  // 2. THREE.JS INITIALIZATION
  // ==========================================================================
  function initThreeMoon() {
    const container = document.getElementById("moon-webgl-canvas");
    if (!container) return;

    // Guard: Retry if Three.js CDN has not finished loading asynchronously
    if (typeof THREE === "undefined") {
      console.warn("[moon_3d] Three.js not loaded. Retrying in 200ms...");
      setTimeout(initThreeMoon, 200);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 92);

    // ------------------------------------------------------------------------
    // A. Scene & Perspective Camera
    // Positioned to provide an oblique perspective focused on the lunar South Pole
    // ------------------------------------------------------------------------
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    // Camera placed at (0, -3.8, 4.5) to look directly at the Artemis exploration zone
    camera.position.set(0, -3.8, 4.5);

    // ------------------------------------------------------------------------
    // B. WebGL Renderer
    // Antialiased, transparent background, with ACES Filmic tone mapping for
    // photorealistic deep-space contrast between sunlit crests and dark shadows.
    // ------------------------------------------------------------------------
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // ------------------------------------------------------------------------
    // C. OrbitControls
    // Smooth inertial damping for user interaction (drag to rotate, scroll to zoom)
    // ------------------------------------------------------------------------
    if (typeof THREE.OrbitControls !== "undefined") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      // CRITICAL: Disable panning so the Moon never drifts off-center into the black void
      controls.enablePan = false;
      controls.screenSpacePanning = false;
      // Clamp zoom range so user cannot clip through the surface or zoom too far out
      controls.minDistance = 3.0;
      controls.maxDistance = 10.0;
      controls.target.set(0, 0, 0); // Focus point is locked to the center of the Moon
    }

    // Helper: Resets camera position and target back to nominal South Pole view
    function recenterMoon() {
      if (!camera || !controls) return;
      camera.position.set(0, -3.8, 4.5);
      controls.target.set(0, 0, 0);
      controls.update();
      if (renderer && scene) renderer.render(scene, camera);
    }

    // ------------------------------------------------------------------------
    // D. Lighting Environment
    // 1. Ambient Light: Simulates low-level cislunar starlight / earthshine in shadows.
    // 2. Directional Sun Light: Strong parallel light source simulating solar illumination.
    // ------------------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0x22242a, 0.5);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfff7ea, 2.2);
    sunLight.position.set(12, 1.5, 8);
    scene.add(sunLight);

    // ------------------------------------------------------------------------
    // E. Moon Mesh & Texture Mapping
    // 64x64 segment UV sphere textured with NASA LROC global cylindrical mosaic.
    // ------------------------------------------------------------------------
    const textureLoader = new THREE.TextureLoader();
    const moonTexture = textureLoader.load(
      "static/images/moon_equirectangular.jpg",
      () => renderer.render(scene, camera) // Re-render immediately on texture arrival
    );
    moonTexture.wrapS = THREE.ClampToEdgeWrapping;
    moonTexture.wrapT = THREE.ClampToEdgeWrapping;

    const geometry = new THREE.SphereGeometry(MOON_RADIUS, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: moonTexture,
      roughness: 0.88,  // Lunar regolith is highly diffuse (rough scattering)
      metalness: 0.05
    });

    moonMesh = new THREE.Mesh(geometry, material);
    scene.add(moonMesh);

    // ------------------------------------------------------------------------
    // F. Multi-Site 3D Surface Pins Container
    // Holds all candidate landing site markers with matching card numbers.
    // ------------------------------------------------------------------------
    pinsContainer = new THREE.Group();
    scene.add(pinsContainer);

    // ------------------------------------------------------------------------
    // G. Tool State: Grab (Default) vs. Mark Tool
    // In Grab mode: dragging rotates the globe, clicks never drop pins.
    // In Mark mode: OrbitControls disabled, clicks immediately drop pins.
    // ------------------------------------------------------------------------
    let currentTool = window.currentCockpitTool || "grab";
    let isDragging = false;
    let downX = 0, downY = 0;

    function updateCursor() {
      const cur = (currentTool === "mark") ? "crosshair" : (isDragging ? "grabbing" : "grab");
      if (renderer && renderer.domElement) renderer.domElement.style.cursor = cur;
      if (container) {
        container.style.cursor = cur;
        container.classList.toggle("tool-mark", currentTool === "mark");
      }
      if (controls) {
        controls.enabled = (currentTool === "grab");
      }
    }
    updateCursor();

    renderer.domElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      downX = e.clientX;
      downY = e.clientY;
      updateCursor();
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        updateCursor();
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener("click", (e) => {
      const tool = currentTool || window.currentCockpitTool || "grab";

      if (tool === "mark") {
        // MARK MODE: Raycast click on lunar surface to drop a new site
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist > 12) return; // Ignore if user dragged across screen

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(moonMesh);

        if (intersects.length > 0) {
          const p = intersects[0].point;
          const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          const lat = 90 - (Math.acos(p.y / r) * 180 / Math.PI);
          let lon = (Math.atan2(p.z, -p.x) * 180 / Math.PI) - 180;
          lon = (lon + 360) % 360;

          const nearest = window.CoordMath 
            ? window.CoordMath.findNearestSite(lat, lon) 
            : { name: `Custom (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)` };

          const siteData = {
            lat,
            lon,
            name: nearest.name,
            source: "moon-3d"
          };

          if (window.eventBus) {
            window.eventBus.emit("site:marked", siteData);
          }
        }
      } else {
        // GRAB MODE: Raycast click on existing 3D pins to select & highlight its card
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist > 8) return; // User dragged to rotate globe

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        if (pinsContainer) {
          const pinIntersects = raycaster.intersectObjects(pinsContainer.children, true);
          if (pinIntersects.length > 0) {
            let target = pinIntersects[0].object;
            while (target && (!target.userData || typeof target.userData.lat !== "number") && target.parent) {
              target = target.parent;
            }
            if (target && target.userData && typeof target.userData.lat === "number") {
              const u = target.userData;
              if (window.eventBus) {
                window.eventBus.emit("site:marked", {
                  lat: u.lat,
                  lon: u.lon,
                  name: u.name,
                  siteId: u.siteId,
                  number: u.number,
                  source: "moon-3d-pin-click"
                });
              }
            }
          }
        }
      }
    });

    // ------------------------------------------------------------------------
    // H. Universal EventBus Subscriptions
    // ------------------------------------------------------------------------
    if (window.eventBus) {
      // Tool selection changed: Grab vs. Mark
      window.eventBus.on("tool:changed", (data) => {
        if (data && data.tool) {
          currentTool = data.tool;
          updateCursor();
        }
      });

      // Recenter camera command
      window.eventBus.on("moon:recenter", () => {
        recenterMoon();
      });

      // Synchronize all candidate landing site pins with comparison deck
      window.eventBus.on("cards:synced", (data) => {
        if (data && Array.isArray(data.cards)) {
          syncPinsFromCards(data.cards);
        }
      });

      // Highlight active pin when an external component selects a site
      window.eventBus.on("site:marked", (data) => {
        if (!data || typeof data.lat !== "number" || typeof data.lon !== "number") return;
        updateActivePin(data.lat, data.lon);
      });

      // Dynamically revolve the Sun around the Moon as timeline progresses
      window.eventBus.on("time:changed", (data) => {
        const angle = (data.sliderValue / 100) * Math.PI * 2;
        sunLight.position.x = Math.cos(angle) * 14;
        sunLight.position.z = Math.sin(angle) * 14;
        sunLight.position.y = Math.sin(angle * 2) * 0.8;
      });
    }

    // ------------------------------------------------------------------------
    // I. Viewport Resize Handling
    // ------------------------------------------------------------------------
    window.addEventListener("resize", () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // ------------------------------------------------------------------------
    // J. Continuous Animation / Render Loop
    // ------------------------------------------------------------------------
    function animate() {
      requestAnimationFrame(animate);
      if (controls) controls.update(); // Required for smooth damping

      // Horizon culling: Hide pins when rotated to the far side of the Moon
      if (camera && pinsMap.size > 0) {
        pinsMap.forEach(pinEntry => {
          if (!pinEntry.coords || !pinEntry.group) return;
          const toCamera = camera.position.clone().sub(pinEntry.coords.vector).normalize();
          const dot = pinEntry.coords.normal.dot(toCamera);
          pinEntry.group.visible = (dot > 0.04);
        });
      }

      renderer.render(scene, camera);
    }
    animate();

    // Trigger initial synchronization of cards from DOM
    setTimeout(() => {
      if (window.ComparisonCards && typeof window.ComparisonCards.sync === "function") {
        window.ComparisonCards.sync();
      } else {
        const cols = document.querySelectorAll(".site-card-column");
        if (cols.length > 0 && pinsMap.size === 0) {
          const initialCards = [];
          cols.forEach((col, idx) => {
            const card = col.querySelector(".site-card");
            if (card) {
              initialCards.push({
                siteId: col.dataset.siteId || `site-${idx+1}`,
                number: idx + 1,
                name: card.dataset.name || `Site ${idx+1}`,
                lat: parseFloat(card.dataset.lat),
                lon: parseFloat(card.dataset.lon),
                active: card.classList.contains("active")
              });
            }
          });
          syncPinsFromCards(initialCards);
        }
      }
    }, 150);
  }

  // ==========================================================================
  // 3. MULTI-SITE 3D SURFACE PIN SUBSYSTEM
  // Manages 3D pin meshes with canvas-rendered numbered billboard sprites
  // ==========================================================================

  function getCartesianCoords(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(MOON_RADIUS * Math.sin(phi) * Math.cos(theta));
    const z = MOON_RADIUS * Math.sin(phi) * Math.sin(theta);
    const y = MOON_RADIUS * Math.cos(phi);
    const vector = new THREE.Vector3(x, y, z);
    const normal = vector.clone().normalize();
    return { x, y, z, vector, normal };
  }

  function createNumberSprite(numberStr, isActive) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 128, 128);

    // Glow / shadow
    if (isActive) {
      ctx.shadowColor = "rgba(200, 125, 85, 0.95)";
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 8;
    }

    // Circular background
    ctx.beginPath();
    ctx.arc(64, 64, 46, 0, 2 * Math.PI);
    ctx.fillStyle = isActive ? "#c87d55" : "rgba(28, 30, 32, 0.92)";
    ctx.fill();

    // Border
    ctx.lineWidth = isActive ? 8 : 6;
    ctx.strokeStyle = isActive ? "#ffffff" : "#8ea8c3";
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Center numeral
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 58px monospace, 'SF Pro Mono', 'Segoe UI Mono', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(numberStr), 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.20, 0.20, 1);
    sprite.position.y = 0.26; // Floats right above pin head
    return sprite;
  }

  function createOrUpdate3DPin(site) {
    if (!pinsContainer || !site || typeof site.lat !== "number" || typeof site.lon !== "number") return;

    const key = site.siteId || `site_${site.lat.toFixed(2)}_${site.lon.toFixed(2)}`;
    const coords = getCartesianCoords(site.lat, site.lon);
    const isActive = Boolean(site.active);
    const number = site.number || 1;

    let pinEntry = pinsMap.get(key);

    if (!pinEntry) {
      const group = new THREE.Group();

      // 1. Ground contact ring (landing target)
      const ringGeo = new THREE.RingGeometry(0.035, 0.055, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isActive ? 0xc87d55 : 0x5a6068,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.005;
      group.add(ringMesh);

      // 2. Tapered stem
      const stemGeo = new THREE.CylinderGeometry(0.012, 0.008, 0.12, 8);
      const stemMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.position.y = 0.06;
      group.add(stemMesh);

      // 3. Spherical pin head
      const headGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const headMat = new THREE.MeshBasicMaterial({
        color: isActive ? 0xc87d55 : 0x8ea8c3
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.y = 0.13;
      group.add(headMesh);

      // 4. Numbered billboard sprite
      const sprite = createNumberSprite(number, isActive);
      group.add(sprite);

      // Positioning & normal orientation
      group.position.set(coords.x, coords.y, coords.z);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coords.normal);

      if (isActive) {
        group.scale.set(1.22, 1.22, 1.22);
      } else {
        group.scale.set(1.0, 1.0, 1.0);
      }

      // Metadata for raycasting
      const meta = {
        siteId: key,
        number: number,
        name: site.name || `Site ${number}`,
        lat: site.lat,
        lon: site.lon,
        isActive: isActive
      };
      group.userData = meta;
      ringMesh.userData = meta;
      stemMesh.userData = meta;
      headMesh.userData = meta;
      sprite.userData = meta;

      pinsContainer.add(group);

      pinEntry = {
        group,
        ringMesh,
        stemMesh,
        headMesh,
        sprite,
        coords,
        data: site
      };
      pinsMap.set(key, pinEntry);
    } else {
      pinEntry.coords = coords;
      pinEntry.data = site;
      pinEntry.group.position.set(coords.x, coords.y, coords.z);
      pinEntry.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coords.normal);

      pinEntry.headMesh.material.color.setHex(isActive ? 0xc87d55 : 0x8ea8c3);
      pinEntry.ringMesh.material.color.setHex(isActive ? 0xc87d55 : 0x5a6068);

      if (isActive) {
        pinEntry.group.scale.set(1.22, 1.22, 1.22);
      } else {
        pinEntry.group.scale.set(1.0, 1.0, 1.0);
      }

      if (pinEntry.sprite) {
        pinEntry.group.remove(pinEntry.sprite);
        if (pinEntry.sprite.material.map) pinEntry.sprite.material.map.dispose();
        if (pinEntry.sprite.material) pinEntry.sprite.material.dispose();
      }
      const newSprite = createNumberSprite(number, isActive);
      pinEntry.sprite = newSprite;
      pinEntry.group.add(newSprite);

      const meta = {
        siteId: key,
        number: number,
        name: site.name || `Site ${number}`,
        lat: site.lat,
        lon: site.lon,
        isActive: isActive
      };
      pinEntry.group.userData = meta;
      pinEntry.ringMesh.userData = meta;
      pinEntry.stemMesh.userData = meta;
      pinEntry.headMesh.userData = meta;
      newSprite.userData = meta;
    }
  }

  function syncPinsFromCards(cardsList) {
    if (!pinsContainer || !Array.isArray(cardsList)) return;

    const activeKeys = new Set();
    cardsList.forEach(card => {
      const key = card.siteId || `site_${card.lat.toFixed(2)}_${card.lon.toFixed(2)}`;
      activeKeys.add(key);
      createOrUpdate3DPin(card);
    });

    // Remove pins that are no longer in the deck
    pinsMap.forEach((entry, key) => {
      if (!activeKeys.has(key)) {
        pinsContainer.remove(entry.group);
        if (entry.sprite && entry.sprite.material.map) entry.sprite.material.map.dispose();
        if (entry.sprite && entry.sprite.material) entry.sprite.material.dispose();
        pinsMap.delete(key);
      }
    });

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function updateActivePin(lat, lon) {
    pinsMap.forEach(entry => {
      const isMatch = (Math.abs(entry.data.lat - lat) < 0.25) &&
                      (Math.abs(entry.data.lon - lon) < 1.0);
      entry.data.active = isMatch;
      entry.headMesh.material.color.setHex(isMatch ? 0xc87d55 : 0x8ea8c3);
      entry.ringMesh.material.color.setHex(isMatch ? 0xc87d55 : 0x5a6068);
      entry.group.scale.set(isMatch ? 1.22 : 1.0, isMatch ? 1.22 : 1.0, isMatch ? 1.22 : 1.0);

      if (entry.sprite) {
        const pinEntryGroup = entry.group;
        pinEntryGroup.remove(entry.sprite);
        if (entry.sprite.material.map) entry.sprite.material.map.dispose();
        if (entry.sprite.material) entry.sprite.material.dispose();
        const newSprite = createNumberSprite(entry.data.number || 1, isMatch);
        entry.sprite = newSprite;
        newSprite.userData = entry.group.userData;
        pinEntryGroup.add(newSprite);
      }
    });
  }

  function update3DPinPosition(lat, lon) {
    createOrUpdate3DPin({
      siteId: `site_${lat.toFixed(2)}_${lon.toFixed(2)}`,
      name: `Site (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)`,
      lat,
      lon,
      number: 1,
      active: true
    });
  }

  // ==========================================================================
  // 4. BOOTSTRAP INITIALIZATION
  // ==========================================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThreeMoon);
  } else {
    initThreeMoon();
  }
})();
