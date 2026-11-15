/**
 * ============================================================================
 * COMPONENT: Three.js 3D Moon Viewport (components/moon_3d/)
 * SCRIPT: moon_3d.js
 *
 * ROLE:
 * Renders the primary interactive 3D WebGL lunar globe using Three.js:
 * - Spherical 3D Moon model with NASA LROC high-resolution albedo texture.
 * - OrbitControls for rotation, pitch, and zoom focusing on the South Pole.
 * - Timeline-driven Keplerian Earth and apparent solar motion.
 * - Raycaster click-to-pin system converting 3D ray intersections to lunar (lat, lon).
 * - Real-time surface pin marker with normal vector orientation to the sphere.
 *
 * DATA FLOW & EVENTBUS INTEGRATION:
 * 📥 DATA IN (Listens to):
 *    - "site:marked"  -> Payload: { lat, lon, name, focus?, openDetails?, detailTab? }
 *                        Updates the 3D surface pin and optionally focuses the camera.
 *    - "time:changed" -> Payload: { sliderValue: number (0-100), timeISO: string }
 *                        Updates Keplerian Earth/Sun positions and lunar illumination.
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
  let celestialSystem = null;
  let celestialMoon = null;
  let celestialMoonLabel = null;
  let celestialSunRay = null;
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
  const MOON_MEAN_RADIUS_KM = 1737.4;
  const SCENE_UNITS_PER_KM = MOON_RADIUS / MOON_MEAN_RADIUS_KM;
  const EARTH_MEAN_RADIUS = 6371 * SCENE_UNITS_PER_KM;
  const SUN_RADIUS = 695700 * SCENE_UNITS_PER_KM;
  const EARTH_MOON_DISTANCE = 384400 * SCENE_UNITS_PER_KM;
  const EARTH_SUN_DISTANCE = 149597870.7 * SCENE_UNITS_PER_KM;
  const SYSTEM_MAX_DISTANCE = EARTH_SUN_DISTANCE * 4;
  const SYSTEM_INITIAL_DISTANCE = 16;
  const TWO_PI = Math.PI * 2;
  const EARTH_ORBIT_PERIOD_DAYS = 27.321661;
  const EARTH_ORBIT_ECCENTRICITY = 0.0549;
  const SUN_APPARENT_PERIOD_DAYS = 29.53059;
  const LUNAR_ORBIT_INCLINATION = 5.145 * (Math.PI / 180);

  function solveKeplerEquation(meanAnomaly, eccentricity) {
    const mean = ((meanAnomaly % TWO_PI) + TWO_PI) % TWO_PI;
    let eccentricAnomaly = mean + eccentricity * Math.sin(mean);
    for (let iteration = 0; iteration < 8; iteration++) {
      const error =
        (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - mean) /
        (1 - eccentricity * Math.cos(eccentricAnomaly));
      eccentricAnomaly -= error;
      if (Math.abs(error) < 1e-10) break;
    }
    return eccentricAnomaly;
  }

  function keplerOrbitPosition(meanAnomaly, orbit) {
    const eccentricAnomaly = solveKeplerEquation(meanAnomaly, orbit.eccentricity);
    const semiMinorAxis =
      orbit.semiMajorAxis * Math.sqrt(1 - orbit.eccentricity ** 2);
    const transverse = semiMinorAxis * Math.sin(eccentricAnomaly);
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + orbit.eccentricity) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - orbit.eccentricity) * Math.cos(eccentricAnomaly / 2)
    );
    return {
      x: orbit.semiMajorAxis * (Math.cos(eccentricAnomaly) - orbit.eccentricity),
      y: transverse * orbit.verticalScale,
      z: transverse * orbit.depthScale,
      trueAnomaly
    };
  }

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
    camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.01,
      EARTH_SUN_DISTANCE * 30
    );

    // MATCH REFERENCE VIEW: Centered full-globe framing
    camera.position.set(0, 0, 5.5);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true
    });
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
      controls.minDistance = MOON_RADIUS * 1.005;
      controls.maxDistance = 15;
      controls.zoomSpeed = 1.1;
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
      const position = keplerOrbitPosition(angle, {
        semiMajorAxis: radius,
        eccentricity: 0,
        verticalScale: 0,
        depthScale: 1
      });
      sunLight.position.x = position.x;
      sunLight.position.z = position.z;
      sunLight.position.y = 3.5;
    }

    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy
      ? renderer.capabilities.getMaxAnisotropy()
      : 8;
    let activeResolution = "8k";

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
      (texture) => {
        configureTexture(texture);
        if (renderer && scene && camera) renderer.render(scene, camera);
      },
      undefined,
      (error) => console.error("Failed to load the lunar normal map.", error),
    );

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

    celestialSystem = new THREE.Group();
    celestialSystem.visible = false;
    scene.add(celestialSystem);

    const starPositions = [];
    for (let i = 0; i < 260; i++) {
      const seed = i * 127.1 + 311.7;
      const random = (value) => {
        const x = Math.sin(value) * 43758.5453;
        return x - Math.floor(x);
      };
      const zDirection = random(seed) * 2 - 1;
      const azimuth = random(seed + 1) * TWO_PI;
      const planarRadius = Math.sqrt(1 - zDirection * zDirection);
      const starRadius = EARTH_SUN_DISTANCE * 15;
      starPositions.push(
        starRadius * planarRadius * Math.cos(azimuth),
        starRadius * zDirection,
        starRadius * planarRadius * Math.sin(azimuth)
      );
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xb9c7e4,
        size: 1.5,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.8
      })
    );
    celestialSystem.add(stars);

    function createCelestialLabel(text, color) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 96;
      const context = canvas.getContext("2d");
      context.font = "700 36px Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "rgba(0, 0, 0, 0.9)";
      context.shadowBlur = 12;
      context.fillStyle = color;
      context.fillText(text, 256, 48);
      const texture = new THREE.CanvasTexture(canvas);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
      }));
      label.scale.set(1.1, 0.21, 1);
      label.renderOrder = 5;
      return label;
    }

    const earthOrbit = {
      semiMajorAxis: EARTH_MOON_DISTANCE,
      eccentricity: EARTH_ORBIT_ECCENTRICITY,
      periodDays: EARTH_ORBIT_PERIOD_DAYS,
      phaseAtEpoch: -1.1,
      verticalScale: Math.sin(LUNAR_ORBIT_INCLINATION),
      depthScale: Math.cos(LUNAR_ORBIT_INCLINATION)
    };
    const sunOrbit = {
      semiMajorAxis: EARTH_SUN_DISTANCE,
      eccentricity: 0,
      periodDays: SUN_APPARENT_PERIOD_DAYS,
      phaseAtEpoch: 0,
      verticalScale: Math.sin(LUNAR_ORBIT_INCLINATION),
      depthScale: Math.cos(LUNAR_ORBIT_INCLINATION)
    };

    function createKeplerOrbitPoints(orbit, segments) {
      const points = [];
      const semiMinorAxis =
        orbit.semiMajorAxis * Math.sqrt(1 - orbit.eccentricity ** 2);
      for (let i = 0; i < segments; i++) {
        const eccentricAnomaly = (i / segments) * TWO_PI;
        const transverse = semiMinorAxis * Math.sin(eccentricAnomaly);
        points.push(new THREE.Vector3(
          orbit.semiMajorAxis *
            (Math.cos(eccentricAnomaly) - orbit.eccentricity),
          transverse * orbit.verticalScale,
          transverse * orbit.depthScale
        ));
      }
      return points;
    }

    celestialSystem.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(createKeplerOrbitPoints(earthOrbit, 180)),
      new THREE.LineBasicMaterial({ color: 0x263fc4, transparent: true, opacity: 0.72 })
    ));

    celestialSystem.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(createKeplerOrbitPoints(sunOrbit, 160)),
      new THREE.LineBasicMaterial({ color: 0x837a36, transparent: true, opacity: 0.22 })
    ));

    const rayMaterial = new THREE.LineBasicMaterial({
      color: 0xe6d454,
      transparent: true,
      opacity: 0.5
    });
    celestialSunRay = new THREE.Line(
      new THREE.BufferGeometry(),
      rayMaterial
    );
    celestialSystem.add(celestialSunRay);

    // NASA/Goddard Blue Marble Earth and NASA SDO/AIA 193 Å Sun imagery.
    function useOrthographicDiskProjection(material, crop) {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uDiskCrop = { value: crop };
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vDiskSpherePosition;"
        ).replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvDiskSpherePosition = normalize(position);"
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vDiskSpherePosition;\nuniform vec4 uDiskCrop;"
        ).replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec3 diskSpherePosition = normalize(vDiskSpherePosition);
            if (diskSpherePosition.z < 0.0) {
              diskSpherePosition.x = -diskSpherePosition.x;
            }
            vec2 diskUv = uDiskCrop.xy +
              (diskSpherePosition.xy * 0.5 + 0.5) * uDiskCrop.zw;
            vec4 texelColor = texture2D(map, diskUv);
            texelColor = mapTexelToLinear(texelColor);
            diffuseColor *= texelColor;
          #endif`
        );
      };
      material.customProgramCacheKey = () => "nasa-orthographic-disk-projection";
    }

    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0
    });
    useOrthographicDiskProjection(
      earthMaterial,
      new THREE.Vector4(0.04, 0.04, 0.92, 0.92)
    );
    textureLoader.load(
      `${assetBase}static/images/earth_blue_marble_2007.jpg`,
      (texture) => {
        configureTexture(texture);
        texture.encoding = THREE.sRGBEncoding;
        earthMaterial.map = texture;
        earthMaterial.needsUpdate = true;
        if (renderer && scene && camera) renderer.render(scene, camera);
      },
      undefined,
      (error) => console.error("Failed to load the NASA Blue Marble Earth image.", error),
    );
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_MEAN_RADIUS, 64, 64),
      earthMaterial
    );
    celestialSystem.add(earthMesh);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_MEAN_RADIUS * 1.06, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x55b9ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    earthMesh.add(atmosphere);
    const earthLabel = createCelestialLabel("EARTH", "#a9d8ff");
    earthLabel.position.set(0, EARTH_MEAN_RADIUS * 1.2, 0);
    celestialSystem.add(earthLabel);

    celestialMoon = new THREE.Mesh(
      new THREE.SphereGeometry(MOON_RADIUS, 128, 128),
      material
    );
    celestialSystem.add(celestialMoon);
    celestialMoonLabel = createCelestialLabel("MOON", "#e7e1d8");
    celestialSystem.add(celestialMoonLabel);

    const sunGroup = new THREE.Group();
    const solarMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false
    });
    useOrthographicDiskProjection(
      solarMaterial,
      new THREE.Vector4(0.055, 0.055, 0.89, 0.89)
    );
    textureLoader.load(
      `${assetBase}static/images/sun_sdo_aia_193_4k.jpg`,
      (texture) => {
        configureTexture(texture);
        texture.encoding = THREE.sRGBEncoding;
        solarMaterial.map = texture;
        solarMaterial.needsUpdate = true;
        if (renderer && scene && camera) renderer.render(scene, camera);
      },
      undefined,
      (error) => console.error("Failed to load the NASA SDO/AIA Sun image.", error),
    );
    const solarDisc = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_RADIUS, 64, 64),
      solarMaterial
    );
    sunGroup.add(solarDisc);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_RADIUS * 1.12, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffa52f,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false
      })
    );
    sunGroup.add(sunGlow);
    const sunLabel = createCelestialLabel("SUN", "#ffe29a");
    sunLabel.position.set(0, SUN_RADIUS * 1.2, 0);
    sunGroup.add(sunLabel);
    celestialSystem.add(sunGroup);

    const SYSTEM_REFERENCE_EPOCH = Date.UTC(2026, 10, 1);
    function updateCelestialPositions(epochMs) {
      const elapsedDays = (epochMs - SYSTEM_REFERENCE_EPOCH) / 86400000;
      const earthMeanAnomaly =
        (elapsedDays / earthOrbit.periodDays) * TWO_PI + earthOrbit.phaseAtEpoch;
      const earthPositionValues = keplerOrbitPosition(
        earthMeanAnomaly,
        earthOrbit
      );
      const earthPosition = new THREE.Vector3(
        earthPositionValues.x,
        earthPositionValues.y,
        earthPositionValues.z
      );
      earthMesh.position.copy(earthPosition);
      earthMesh.rotation.y = -earthPositionValues.trueAnomaly;
      earthLabel.position.copy(earthPosition).add(
        new THREE.Vector3(0, EARTH_MEAN_RADIUS * 1.2, 0)
      );

      celestialMoon.position.set(0, 0, 0);
      celestialMoon.rotation.y = moonMesh.rotation.y;
      celestialMoonLabel.position.set(0, MOON_RADIUS * 1.18, 0);

      currentSunAngle =
        (elapsedDays / sunOrbit.periodDays) * TWO_PI + sunOrbit.phaseAtEpoch;
      const sunPositionValues = keplerOrbitPosition(currentSunAngle, sunOrbit);
      const sunPosition = new THREE.Vector3(
        sunPositionValues.x,
        sunPositionValues.y,
        sunPositionValues.z
      );
      sunGroup.position.copy(sunPosition);
      const towardMoon = sunPosition.clone().negate().normalize();
      celestialSunRay.geometry.setFromPoints([
        sunPosition.clone().addScaledVector(towardMoon, SUN_RADIUS * 1.02),
        towardMoon.clone().multiplyScalar(MOON_RADIUS * 1.05)
      ]);
      updateSunPosition(currentSunAngle);
    }

    updateCelestialPositions(Date.UTC(2026, 10, 15, 14));

    let isSystemView = false;
    let lastGalaxyOpacity = -1;
    const zoomBodies = [
      { mesh: celestialMoon, radius: MOON_RADIUS },
      { mesh: earthMesh, radius: EARTH_MEAN_RADIUS },
      { mesh: solarDisc, radius: SUN_RADIUS }
    ];
    const zoomRaycaster = new THREE.Raycaster();
    renderer.domElement.addEventListener(
      "wheel",
      (event) => {
        if (!isSystemView || !controls || !controls.enabled) return;
        event.preventDefault();
        event.stopImmediatePropagation();

        const bounds = renderer.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1
        );
        zoomRaycaster.setFromCamera(pointer, camera);
        const intersections = zoomRaycaster.intersectObjects(
          zoomBodies.map(({ mesh }) => mesh),
          false
        );
        if (intersections.length) {
          const focusedBody = zoomBodies.find(
            ({ mesh }) => mesh === intersections[0].object
          );
          if (focusedBody) {
            controls.target.copy(
              focusedBody.mesh.getWorldPosition(new THREE.Vector3())
            );
            controls.minDistance = focusedBody.radius * 1.005;
          }
        }

        const offset = camera.position.clone().sub(controls.target);
        const zoomFactor = Math.exp(event.deltaY * 0.0035);
        const nextDistance = THREE.MathUtils.clamp(
          offset.length() * zoomFactor,
          controls.minDistance,
          controls.maxDistance
        );
        offset.setLength(nextDistance);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
      { capture: true, passive: false }
    );

    function setViewportMode(mode) {
      isSystemView = mode === "system";
      celestialSystem.visible = isSystemView;
      moonMesh.visible = !isSystemView;
      if (pinsContainer) pinsContainer.visible = !isSystemView;
      if (sunLight) sunLight.visible = true;

      const clarityHud = document.getElementById("moon-clarity-hud");
      const caption = document.getElementById("celestial-view-caption");
      const surfaceButton = document.getElementById("btn-surface-view");
      const systemButton = document.getElementById("btn-system-view");
      if (clarityHud) clarityHud.hidden = isSystemView;
      if (caption) caption.classList.toggle("visible", isSystemView);
      if (surfaceButton) {
        surfaceButton.classList.toggle("active", !isSystemView);
        surfaceButton.setAttribute("aria-pressed", String(!isSystemView));
      }
      if (systemButton) {
        systemButton.classList.toggle("active", isSystemView);
        systemButton.setAttribute("aria-pressed", String(isSystemView));
      }

      if (camera && controls) {
        controls.zoomSpeed = isSystemView ? 5 : 1.1;
        controls.minDistance = MOON_RADIUS * 1.005;
        controls.enablePan = isSystemView;
        controls.screenSpacePanning = isSystemView;
        controls.panSpeed = isSystemView ? 0.5 : 1;
        controls.mouseButtons.LEFT = isSystemView
          ? THREE.MOUSE.PAN
          : THREE.MOUSE.ROTATE;
        controls.mouseButtons.RIGHT = isSystemView
          ? THREE.MOUSE.ROTATE
          : THREE.MOUSE.PAN;
        const solarOrbitFrameDistance =
          EARTH_SUN_DISTANCE /
          (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
        controls.maxDistance = isSystemView
          ? Math.max(SYSTEM_MAX_DISTANCE, solarOrbitFrameDistance * 1.15)
          : 15;
        if (isSystemView) {
          const directionToEarth = earthMesh.position.clone().normalize();
          const cameraDirection = directionToEarth
            .negate()
            .applyAxisAngle(
              new THREE.Vector3(0, 1, 0),
              (22 * Math.PI) / 180
            );
          camera.position.copy(cameraDirection.multiplyScalar(SYSTEM_INITIAL_DISTANCE));
        } else {
          camera.position.set(0, 0, 5.5);
        }
        controls.target.set(0, 0, 0);
        controls.update();
      }
      if (renderer && scene && camera) renderer.render(scene, camera);
    }

    document.getElementById("btn-surface-view")?.addEventListener("click", () => {
      setViewportMode("surface");
    });
    document.getElementById("btn-system-view")?.addEventListener("click", () => {
      setViewportMode("system");
    });

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

    renderer.domElement.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length > 0) {
        isCameraFocusing = false;
        targetCameraPos = null;
        downX = e.touches[0].clientX;
        downY = e.touches[0].clientY;
      }
    }, { passive: true });

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

        // 1. Advance the globe around the highlighted surface point and update celestial system
        const timelineEpoch = Number.isFinite(data.currentEpoch)
          ? data.currentEpoch
          : Number.isFinite(data.unixEpoch)
            ? data.unixEpoch
            : Date.parse(data.isoString);
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
          updateCelestialPositions(timelineEpoch);
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
      if (controls && container) {
        const cameraDistance = camera.position.distanceTo(controls.target);
        const galaxyOpacity = isSystemView
          ? THREE.MathUtils.smoothstep(
              cameraDistance,
              EARTH_SUN_DISTANCE * 0.2,
              EARTH_SUN_DISTANCE * 0.7
            )
          : 0;
        if (Math.abs(galaxyOpacity - lastGalaxyOpacity) > 0.01) {
          container.style.setProperty("--galaxy-opacity", galaxyOpacity.toFixed(3));
          lastGalaxyOpacity = galaxyOpacity;
        }
      }
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
    const meanAnomaly = ((sliderValue || 0) / 100) * TWO_PI;
    const orbitPosition = keplerOrbitPosition(meanAnomaly, {
      semiMajorAxis: 1,
      eccentricity: 0,
      verticalScale: 0,
      depthScale: 1
    });
    const angle = orbitPosition.trueAnomaly;
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
