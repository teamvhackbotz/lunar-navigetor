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
 *    - "site:marked"  -> Payload: { lat, lon, name, focus?, openDetails?, detailTab? }
 *                        Updates the 3D surface pin and optionally focuses the camera.
 *    - "time:changed" -> Payload: { sliderValue: number (0-100), timeISO: string }
 *                        Orbits the directional sunlight around the lunar ecliptic plane
 *                        with a 1.54° axial tilt simulation.
 *
 * 📤 DATA OUT (Emits):
 *    - "site:marked"  -> Payload: { lat, lon, name, source: "moon-3d" }
 *                        Fires when the user clicks anywhere on the 3D lunar surface.
 * ============================================================================
 */

(function () {
  let scene, camera, renderer, controls;
  let moonMesh, sunLight;
  const pinsMap = new Map();
  let pinsContainer = null;
  let lastEphemerisRequest = null;
  let ephemerisCache = new Map();
  let targetCameraPos = null;
  let isCameraFocusing = false;
  let activeSpinAxis = null;
  let defaultSpinAxis = null;
  let lastTimelineEpoch = null;
  let measurementGroup = null;

  // Standard WebGL world radius of the lunar sphere
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
    defaultSpinAxis = new THREE.Vector3(0, 1, 0);

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
    moonMesh.add(pinsContainer);

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
      isCameraFocusing = false;
      targetCameraPos = null;
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
          const p = moonMesh.worldToLocal(intersects[0].point.clone());
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

    renderer.domElement.addEventListener("contextmenu", event => {
      if (!pinsContainer || !window.SiteMeasurement) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObject(pinsContainer, true)
        .find(intersection =>
          intersection.object.userData &&
          intersection.object.userData.siteId
        );
      if (hit) {
        window.SiteMeasurement.handleContextMenu(event, hit.object.userData);
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

      // Synchronize all candidate landing site pins with comparison deck
      window.eventBus.on("cards:synced", (data) => {
        if (data && Array.isArray(data.cards)) {
          if (window.SiteMeasurement) {
            window.SiteMeasurement.syncSites(data.cards);
          }
          syncPinsFromCards(data.cards);
          const activeCard = data.cards.find(card => card.active);
          if (activeCard) {
            setSpinAxisForSite(activeCard.lat, activeCard.lon);
            window._lastMarkedSite = {
              lat: activeCard.lat,
              lon: activeCard.lon,
              name: activeCard.name
            };
          } else {
            activeSpinAxis = null;
          }
        }
      });

      // Highlight active pin when an external component selects a site
      window.eventBus.on("site:marked", (data) => {
        if (!data || !Number.isFinite(data.lat) || !Number.isFinite(data.lon) ||
            data.lat < -90 || data.lat > 90) return;
        window._lastMarkedSite = { lat: data.lat, lon: data.lon, name: data.name };
        const foundPin = updateActivePin(data.lat, data.lon);
        if (!foundPin) {
          createOrUpdate3DPin({ ...data, active: true });
        }
        setSpinAxisForSite(data.lat, data.lon);
        if (data.focus !== false) {
          focusOnCoordinates(data.lat, data.lon);
        }
      });

      window.eventBus.on("site-measurement:selection-changed", () => {
        updateMeasurementPinStyles();
      });

      window.eventBus.on("site-measurement:changed", render3DMeasurement);

      // Dynamically revolve the Sun around the Moon as timeline progresses
      window.eventBus.on("time:changed", (data) => {
        if (!data) return;

        // 1. Advance the globe around the highlighted surface point when one is active.
        const timelineEpoch = Number.isFinite(data.currentEpoch)
          ? data.currentEpoch
          : data.unixEpoch;
        if (Number.isFinite(timelineEpoch) && moonMesh) {
          const daysElapsed = timelineEpoch / (1000 * 60 * 60 * 24);
          if (lastTimelineEpoch === null && !activeSpinAxis) {
            moonMesh.quaternion.setFromAxisAngle(
              defaultSpinAxis,
              (daysElapsed * 0.1) % (Math.PI * 2)
            );
          } else if (lastTimelineEpoch !== null) {
            const elapsedDays = (timelineEpoch - lastTimelineEpoch) / (1000 * 60 * 60 * 24);
            spinMoonBy(elapsedDays * 0.1);
          }
          lastTimelineEpoch = timelineEpoch;
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

    if (window.ComparisonCards && typeof window.ComparisonCards.getMarkedSites === "function") {
      const sites = window.ComparisonCards.getMarkedSites();
      syncPinsFromCards(sites);
      if (window.SiteMeasurement) {
        window.SiteMeasurement.syncSites(sites);
      }
    }
    if (window.SiteMeasurement) {
      updateMeasurementPinStyles();
      render3DMeasurement(window.SiteMeasurement.getMeasurement());
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
      if (isCameraFocusing && targetCameraPos && camera) {
        camera.position.lerp(targetCameraPos, 0.08);
        if (controls) controls.target.set(0, 0, 0);
        if (camera.position.distanceTo(targetCameraPos) < 0.02) {
          camera.position.copy(targetCameraPos);
          isCameraFocusing = false;
        }
      }

      // Check playback state or active play buttons/classes
      const anyPlayBtnActive = document.querySelector(
        '.playing, .active-play, [data-playing="true"]',
      );
      if (isPlaying || window.isTimelinePlaying || anyPlayBtnActive) {
        spinMoonBy(0.003);
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

  function getWorldSiteNormal(lat, lon) {
    const normal = getCartesianCoords(lat, lon).normal;
    if (!moonMesh) return normal;
    moonMesh.updateMatrixWorld(true);
    return normal.applyQuaternion(
      moonMesh.getWorldQuaternion(new THREE.Quaternion())
    ).normalize();
  }

  function setSpinAxisForSite(lat, lon) {
    if (!moonMesh || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    activeSpinAxis = getWorldSiteNormal(lat, lon);
  }

  function spinMoonBy(angle) {
    if (!moonMesh || !Number.isFinite(angle)) return;
    const axis = activeSpinAxis || defaultSpinAxis;
    if (!axis) return;

    // Premultiplying rotates in world space, keeping the highlighted radial axis fixed.
    const delta = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    moonMesh.quaternion.premultiply(delta).normalize();
  }

  function focusOnCoordinates(lat, lon) {
    if (!camera || typeof THREE === "undefined" || !Number.isFinite(lat) ||
        !Number.isFinite(lon) || lat < -90 || lat > 90) return false;
    targetCameraPos = getWorldSiteNormal(lat, lon).multiplyScalar(5.4);
    isCameraFocusing = true;
    return true;
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

  function isSiteMeasureSelected(site) {
    return Boolean(window.SiteMeasurement && window.SiteMeasurement.isSelected(site));
  }

  function updateMeasurementPinStyles() {
    pinsMap.forEach(entry => {
      const selected = isSiteMeasureSelected(entry.data);
      const active = Boolean(entry.data.active);
      entry.ringMesh.material.color.setHex(selected ? 0x299cff : active ? 0xc87d55 : 0x5a6068);
      entry.headMesh.material.color.setHex(selected ? 0x299cff : active ? 0xc87d55 : 0x8ea8c3);
      const scale = selected ? 1.3 : active ? 1.22 : 1.0;
      entry.group.scale.set(scale, scale, scale);
    });
  }

  function clear3DMeasurement() {
    if (!measurementGroup || !moonMesh) return;
    moonMesh.remove(measurementGroup);
    measurementGroup.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (object.material.map) object.material.map.dispose();
        object.material.dispose();
      }
    });
    measurementGroup = null;
  }

  function render3DMeasurement(measurement) {
    clear3DMeasurement();
    if (!measurement || !moonMesh || !Array.isArray(measurement.path) ||
        measurement.path.length < 2) return;

    measurementGroup = new THREE.Group();
    const surfacePoints = measurement.path.map(point =>
      getCartesianCoords(point.lat, point.lon).vector.multiplyScalar(1.006)
    );
    const lineCurve = new THREE.CatmullRomCurve3(surfacePoints);
    const lineGeometry = new THREE.TubeGeometry(
      lineCurve,
      Math.max(64, measurement.path.length - 1),
      0.012,
      6,
      false
    );
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x299cff,
      depthTest: true,
      depthWrite: false
    });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.renderOrder = 2;
    measurementGroup.add(line);

    const midpoint = measurement.path[Math.floor(measurement.path.length / 2)];
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const context = labelCanvas.getContext("2d");
    context.fillStyle = "rgba(8, 24, 42, 0.92)";
    context.fillRect(4, 8, 248, 48);
    context.strokeStyle = "#299cff";
    context.lineWidth = 3;
    context.strokeRect(4, 8, 248, 48);
    context.fillStyle = "#58adff";
    context.font = "bold 28px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${measurement.distanceKm.toFixed(1)} km`, 128, 33);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      depthTest: true,
      depthWrite: false
    });
    const label = new THREE.Sprite(labelMaterial);
    label.scale.set(0.78, 0.2, 1);
    label.position.copy(
      getCartesianCoords(midpoint.lat, midpoint.lon).vector.multiplyScalar(1.055)
    );
    label.renderOrder = 3;
    measurementGroup.add(label);
    moonMesh.add(measurementGroup);
  }

  function createOrUpdate3DPin(site) {
    if (!pinsContainer || !site || typeof site.lat !== "number" || typeof site.lon !== "number") return;

    const key = site.siteId || `site_${site.lat.toFixed(2)}_${site.lon.toFixed(2)}`;
    const coords = getCartesianCoords(site.lat, site.lon);
    const isActive = Boolean(site.active);
    const isMeasureSelected = isSiteMeasureSelected(site);
    const number = site.number || 1;

    let pinEntry = pinsMap.get(key);

    if (!pinEntry) {
      const group = new THREE.Group();

      // 1. Ground contact ring (landing target)
      const ringGeo = new THREE.RingGeometry(0.035, 0.055, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isMeasureSelected ? 0x299cff : isActive ? 0xc87d55 : 0x5a6068,
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
        color: isMeasureSelected ? 0x299cff : isActive ? 0xc87d55 : 0x8ea8c3
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

      const scale = isMeasureSelected ? 1.3 : isActive ? 1.22 : 1.0;
      group.scale.set(scale, scale, scale);

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

      pinEntry.headMesh.material.color.setHex(isMeasureSelected ? 0x299cff : isActive ? 0xc87d55 : 0x8ea8c3);
      pinEntry.ringMesh.material.color.setHex(isMeasureSelected ? 0x299cff : isActive ? 0xc87d55 : 0x5a6068);
      const scale = isMeasureSelected ? 1.3 : isActive ? 1.22 : 1.0;
      pinEntry.group.scale.set(scale, scale, scale);

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
    let foundPin = false;
    pinsMap.forEach(entry => {
      const isMatch = (Math.abs(entry.data.lat - lat) < 0.25) &&
                      (Math.abs((entry.data.lon - lon + 540) % 360 - 180) < 1.0);
      if (isMatch) foundPin = true;
      entry.data.active = isMatch;
      const selected = isSiteMeasureSelected(entry.data);
      entry.headMesh.material.color.setHex(selected ? 0x299cff : isMatch ? 0xc87d55 : 0x8ea8c3);
      entry.ringMesh.material.color.setHex(selected ? 0x299cff : isMatch ? 0xc87d55 : 0x5a6068);
      const scale = selected ? 1.3 : isMatch ? 1.22 : 1.0;
      entry.group.scale.set(scale, scale, scale);

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
    return foundPin;
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
