/**
 * ============================================================================
 * COMPONENT: Three.js 3D Moon Viewport (components/moon_3d/)
 * SCRIPT: moon_3d.js
 * ============================================================================
 */

(function () {
  let scene, camera, renderer, controls;
  let moonMesh, sunLight;
  const pinsMap = new Map();
  let pinsContainer = null;
  let lastEphemerisRequest = null;
  let ephemerisCache = new Map();

  const MOON_RADIUS = 2.5;

  function initThreeMoon() {

    // Wire up bottom 4K / 8K HUD texture switcher buttons
    const clarityButtons = document.querySelectorAll('.moon-clarity-hud .hud-pill-btn');
    clarityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetRes = btn.dataset.res; // '4k' or '8k'
        if (targetRes) {
          applyTextureResolution(targetRes);
        }
      });
    });

    const container = document.getElementById("moon-webgl-canvas");
    if (!container) return;

    if (typeof THREE === "undefined") {
      setTimeout(initThreeMoon, 200);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight - 92;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

    // MATCH REFERENCE VIEW: Centered full-globe framing
    camera.position.set(0, 0, 5.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    if (typeof THREE.OrbitControls !== "undefined") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = false;
      controls.screenSpacePanning = false;
      controls.minDistance = 3.0;
      controls.maxDistance = 10.0;
      controls.target.set(0, 0, 0);
    }

    function recenterMoon() {
      if (!camera || !controls) return;
      camera.position.set(0, 0, 5.5);
      controls.target.set(0, 0, 0);
      controls.update();
      if (renderer && scene) renderer.render(scene, camera);
    }

    const ambientLight = new THREE.AmbientLight(0x22242a, 0.5);
    scene.add(ambientLight);

    // MATCH REFERENCE LIGHTING: Dynamic directional sunlight
    sunLight = new THREE.DirectionalLight(0xfff7ea, 2.4);
    sunLight.position.set(15, 3.5, 0);
    scene.add(sunLight);

    let currentSunAngle = 0;

    function updateSunPosition(angle) {
      if (!sunLight) return;
      const radius = 15;
      sunLight.position.x = Math.cos(angle) * radius;
      sunLight.position.z = Math.sin(angle) * radius;
      sunLight.position.y = 3.5;
    }

    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy
      ? renderer.capabilities.getMaxAnisotropy()
      : 8;
    let activeResolution =
      localStorage.getItem("moon_texture_resolution") || "8k";

    function configureTexture(tex) {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
    }

    const assetBase =
      window.location.pathname &&
      window.location.pathname.includes("/components/")
        ? "../../"
        : "";

    const normalTexture = textureLoader.load(
      `${assetBase}static/images/moon_normal.png`,
      () => {
        if (renderer && scene && camera) renderer.render(scene, camera);
      },
    );
    configureTexture(normalTexture);

    const geometry = new THREE.SphereGeometry(MOON_RADIUS, 128, 128);
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.04,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });

    moonMesh = new THREE.Mesh(geometry, material);
    scene.add(moonMesh);

    function updateHUDUI(res, state) {
      const dot = document.querySelector("#hud-clarity-status .hud-status-dot");
      const text = document.getElementById("hud-res-text");
      const buttons = document.querySelectorAll(
        ".clarity-switcher-group .hud-pill-btn",
      );

      if (buttons) {
        buttons.forEach((btn) =>
          btn.classList.toggle("active", btn.dataset.res === res),
        );
      }
      if (text) {
        text.textContent =
          state === "loading"
            ? `LOADING ${res.toUpperCase()}...`
            : res === "8k"
              ? "8K ULTRA-HD"
              : "4K HIGH-RES";
      }
      if (dot) {
        dot.className =
          "hud-status-dot " + (state === "loading" ? "loading" : "pulse");
      }
    }

    function applyTextureResolution(res) {
      activeResolution = res;
      localStorage.setItem("moon_texture_resolution", res);
      updateHUDUI(res, "loading");

      const file =
        res === "8k"
          ? `${assetBase}static/images/moon_8k.jpg`
          : `${assetBase}static/images/moon_4k.jpg`;

      textureLoader.load(
        file,
        (loadedTex) => {
          configureTexture(loadedTex);
          material.map = loadedTex;
          material.needsUpdate = true;
          updateHUDUI(res, "ready");
          if (renderer && scene && camera) renderer.render(scene, camera);
        },
        undefined,
        () => {
          updateHUDUI(res, "ready");
        },
      );
    }

    textureLoader.load(
      `${assetBase}static/images/moon_4k.jpg`,
      (fastTex) => {
        configureTexture(fastTex);
        material.map = fastTex;
        material.needsUpdate = true;
        if (activeResolution === "8k") {
          applyTextureResolution("8k");
        } else {
          updateHUDUI("4k", "ready");
        }
        if (renderer && scene && camera) renderer.render(scene, camera);
      },
      undefined,
      () => {
        applyTextureResolution(activeResolution);
      },
    );

    pinsContainer = new THREE.Group();
    scene.add(pinsContainer);

    let currentTool = window.currentCockpitTool || "grab";
    let isDragging = false;
    let downX = 0,
      downY = 0;

    function updateCursor() {
      const cur =
        currentTool === "mark" ? "crosshair" : isDragging ? "grabbing" : "grab";
      if (renderer && renderer.domElement)
        renderer.domElement.style.cursor = cur;
      if (container) {
        container.style.cursor = cur;
        container.classList.toggle("tool-mark", currentTool === "mark");
      }
      if (controls) controls.enabled = currentTool === "grab";
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
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist > 12) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(moonMesh);

        if (intersects.length > 0) {
          const p = intersects[0].point;
          const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          const lat = 90 - (Math.acos(p.y / r) * 180) / Math.PI;
          let lon = (Math.atan2(p.z, -p.x) * 180) / Math.PI - 180;
          lon = (lon + 360) % 360;

          const nearest = window.CoordMath
            ? window.CoordMath.findNearestState
              ? window.CoordMath.findNearestSite(lat, lon)
              : null
            : null;
          const siteName = nearest
            ? nearest.name
            : `Custom (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)`;
          if (window.eventBus) {
            window.eventBus.emit("site:marked", {
              lat,
              lon,
              name: siteName,
              source: "moon-3d",
            });
          }
        }
      }
    });

    // Global timeline state listener
    let isPlaying = false;

    if (window.eventBus) {
      window.eventBus.on("tool:changed", (data) => {
        if (data && data.tool) {
          currentTool = data.tool;
          updateCursor();
        }
      });
      window.eventBus.on("moon:recenter", recenterMoon);

      window.eventBus.on("timeline:play", () => {
        isPlaying = true;
      });
      window.eventBus.on("timeline:pause", () => {
        isPlaying = false;
      });
      window.eventBus.on("timeline:toggle", () => {
        isPlaying = !isPlaying;
      });

      window.eventBus.on("time:changed", (data) => {
        if (!data) return;

        // 1. Sync Moon axial rotation from new timeline epoch if provided
        if (data.unixEpoch && moonMesh) {
          const daysElapsed = data.unixEpoch / (1000 * 60 * 60 * 24);
          moonMesh.rotation.y = (daysElapsed * 0.1) % (Math.PI * 2);
          currentSunAngle = (daysElapsed / 29.53) * Math.PI * 2;
          updateSunPosition(currentSunAngle);
        }

        // 2. Apply fallback immediately (simulated) for instant visual feedback
        applySunPosition(null, data.sliderValue);

        // 3. Then fetch real ephemeris for the active site (debounced)
        clearTimeout(lastEphemerisRequest);
        lastEphemerisRequest = setTimeout(async () => {
          // Use the last marked site coordinates, defaulting to South Pole if none
          const site = window._lastMarkedSite || { lat: -89.4, lon: 222.6 };
          const ephem = await fetchEphemeris(site.lat, site.lon, data.sliderValue, data.isoString);
          if (ephem) {
            applySunPosition(ephem, data.sliderValue);
            // Broadcast ephemeris to other components
            if (window.eventBus) {
              window.eventBus.emit("ephemeris:updated", ephem);
            }
          }
        }, 600);

        if (renderer && scene && camera) renderer.render(scene, camera);
      });
    }

    // Also auto-detect play button clicks anywhere in the DOM as a robust fallback
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (
        btn &&
        (btn.classList.contains("play") ||
          btn.querySelector(".fa-play") ||
          btn.textContent.includes("▶"))
      ) {
        isPlaying = !isPlaying;
      }
    });

    window.addEventListener("resize", () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    function animate() {
      requestAnimationFrame(animate);

      // Check playback state or active play buttons/classes
      const anyPlayBtnActive = document.querySelector(
        '.playing, .active-play, [data-playing="true"]',
      );
      if (isPlaying || window.isTimelinePlaying || anyPlayBtnActive) {
        if (moonMesh) {
          moonMesh.rotation.y += 0.003;
        }
        currentSunAngle += 0.008; // Dynamically sweeps the shadow terminator across the polar craters
        updateSunPosition(currentSunAngle);
      }

      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }
    animate();
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

  async function fetchEphemeris(lat, lon, sliderValue, isoString) {
    // 1. Instant check in client-side high-performance LunarPhysics engine (< 1µs)
    if (window.LunarPhysics) {
      const site = window.LunarPhysics.findSite({ lat, lon });
      if (site) {
        const hourIdx = window.LunarPhysics.sliderToHourIndex(sliderValue);
        const evalData = window.LunarPhysics.evaluateAtHour(site, hourIdx);
        if (evalData) {
          return {
            sun: { az: evalData.sunAz, el: evalData.sunEl },
            earth: { az: evalData.earthAz, el: evalData.earthEl },
            source: "lunar_physics_luts"
          };
        }
      }
    }

    // 2. Fallback to ISO string from timeline or compute November 2026 UTC timestamp
    const dt = isoString || (function() {
      const baseEpoch = Date.UTC(2026, 10, 1);
      const totalHours = 30 * 24;
      const ms = baseEpoch + (sliderValue / 100) * totalHours * 3600 * 1000;
      return new Date(ms).toISOString();
    })();

    const cacheKey = `${lat.toFixed(1)},${lon.toFixed(1)},${Math.round(sliderValue)}`;
    if (ephemerisCache.has(cacheKey)) {
      return ephemerisCache.get(cacheKey);
    }

    try {
      const url = `http://localhost:8000/api/ephemeris?lat=${lat}&lon=${lon}&dt=${encodeURIComponent(dt)}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!resp.ok) throw new Error("API error");
      const data = await resp.json();
      ephemerisCache.set(cacheKey, data);
      if (ephemerisCache.size > 100) {
        ephemerisCache.delete(ephemerisCache.keys().next().value);
      }
      return data;
    } catch (err) {
      // Silent fallback: simulated ephemeris
      return null;
    }
  }

  function applySunPosition(ephem, sliderValue) {
    if (!sunLight) return;
    // Lunar axial tilt is 1.54°. In November 2026, the southern hemisphere is tilted towards the Sun.
    const subLatRad = -1.54 * (Math.PI / 180);
    const angle = ((sliderValue || 0) / 100) * Math.PI * 2;
    const dist = 14;

    sunLight.position.set(
      Math.cos(angle) * Math.cos(subLatRad) * dist,
      Math.sin(subLatRad) * dist,
      Math.sin(angle) * Math.cos(subLatRad) * dist
    );
    sunLight.intensity = 2.2;
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
