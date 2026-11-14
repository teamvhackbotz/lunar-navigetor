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
        if (data && data.unixEpoch) {
          const daysElapsed = data.unixEpoch / (1000 * 60 * 60 * 24);
          if (moonMesh) {
            moonMesh.rotation.y = (daysElapsed * 0.1) % (Math.PI * 2);
          }
          currentSunAngle = (daysElapsed / 29.53) * Math.PI * 2;
          updateSunPosition(currentSunAngle);
          if (renderer && scene && camera) renderer.render(scene, camera);
        }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThreeMoon);
  } else {
    initThreeMoon();
  }
})();
