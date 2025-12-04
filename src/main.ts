import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PhysicsEngine } from "./classes/PhysicsEngine.ts";
import { GameScene } from "./classes/GameScene.ts";
import { SceneManager } from "./classes/SceneManager.ts";
import { SaveManager } from "./classes/SaveManager.ts";

// ---------- Settings ----------
const enableCameraControls = false;

// ---------- Main Program ----------
// Wrap in async IIFE to support older browsers
(async () => {
  // Ensure DOM is ready before touching document.body / DOM elements.
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) =>
      document.addEventListener("DOMContentLoaded", () => resolve())
    );
  }

  // Create global physics variables
  const physics = new PhysicsEngine();
  await physics.init();

  // Create global scene manager
  const sceneManager = new SceneManager();

  let lastTime = globalThis.performance?.now() ?? 0;

  // #region - Scene Navigation Buttons ----------
  const btnLeft = document.createElement("div");
  btnLeft.innerHTML = "⟵";
  btnLeft.className = "nav-btn nav-left";
  btnLeft.style.display = "none"; // Hidden by default (visibility toggled in code)
  document.body.appendChild(btnLeft);

  const btnRight = document.createElement("div");
  btnRight.innerHTML = "⟶";
  btnRight.className = "nav-btn nav-right";
  btnRight.style.display = "none"; // Hidden by default (visibility toggled in code)
  document.body.appendChild(btnRight);

  btnLeft.classList.add("nav-left");
  btnRight.classList.add("nav-right");

  // #endregion

  // #region - Camera Controls ----------
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75, // FOV
    globalThis.innerWidth / globalThis.innerHeight, // Aspect
    0.1, // Near
    1000, // Far
  );
  camera.position.z = 10;

  // Create renderer with alpha so we can temporarily make the canvas transparent
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
  renderer.setClearColor(0xffffff, 1); // default opaque white background
  document.body.appendChild(renderer.domElement);

  // Add camera orbit controls
  let cameraControls: OrbitControls | null = null;
  if (enableCameraControls) {
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true;
    cameraControls.dampingFactor = 0.05;

    // Set camera controls
    cameraControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY, // Zoom
      RIGHT: THREE.MOUSE.ROTATE, // Orbit camera
    };

    cameraControls.update();
  }
  // #endregion

  // #region - Scene Objects ----------
  // Create scenes
  const scene1 = new GameScene(physics);
  const scene2 = new GameScene(physics);

  // Add lighting
  const light1 = new THREE.AmbientLight(0xffffff, 1);
  scene1.addLight(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1);
  light2.position.set(1, 1, 1);
  scene2.addLight(light2);

  // Add static ground planes
  const ground1 = physics.addBox(
    new THREE.Vector3(20, 1, 20), // Ground size
    new THREE.Vector3(0, -5, 0), // Starting position
    0, // Mass (0 = static object)
    0x4444ff, // Blue
  );
  scene1.addMesh(ground1);

  const ground2 = physics.addBox(
    new THREE.Vector3(20, 1, 20), // Ground size
    new THREE.Vector3(0, -5, 0), // Starting position
    0, // Mass (0 = static object)
    0x777777, // Gray
  );
  scene2.addMesh(ground2);

  // Add a win ground
  const winGround = physics.addBox(
    new THREE.Vector3(5, 1, 20), // Win ground size
    new THREE.Vector3(5, -4, 0), // Starting position
    0, // Mass (0 = static object)
    0x22aa22, // Green
  );
  scene2.addMesh(winGround);

  // Add a fail ground
  const failGround = physics.addBox(
    new THREE.Vector3(5, 1, 20), // Fail ground size
    new THREE.Vector3(-5, -4, 0), // Starting position
    0, // Mass (0 = static object)
    0xaa2222, // Red
  );
  scene2.addMesh(failGround);

  // Add an interactive physics cube
  const mainCube = physics.addBox(
    new THREE.Vector3(1, 1, 1), // Cube size
    new THREE.Vector3(0, -4, 0), // Starting position
    1, // Mass
    0x00ff00, // Green
  );
  scene1.addMesh(mainCube);
  // Create a silhouette outline mesh on cube
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0xffff66,
    side: THREE.BackSide,
  });
  const outlineGeo = (mainCube.geometry as THREE.BufferGeometry).clone();
  const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
  outlineMesh.scale.set(1.08, 1.08, 1.08);
  outlineMesh.visible = false;
  mainCube.add(outlineMesh);
  mainCube.userData.outline = outlineMesh;
  let physicsActive = true; // Track if cube is under physics simulation

  // Add scenes to scene manager
  sceneManager.addScene("room1", scene1);
  sceneManager.addScene("room2", scene2);

  // Ensure physics bodies are active only for the current scene
  function updateScenePhysics() {
    const active = sceneManager.getCurrentScene();
    const all = sceneManager.getAllScenes();
    for (const scene of all) {
      const meshes = scene.getMeshes();
      for (const mesh of meshes) {
        const hasBody = !!mesh.userData.physicsBody;
        if (scene === active) {
          if (!hasBody) {
            const mass = mesh.userData.mass ?? 0;
            physics.addMesh(mesh, mass);
          }
        } else {
          if (hasBody) {
            physics.removeMesh(mesh);
          }
        }
      }
    }
  }
  // #endregion

  // #region - Scene Navigation Logic ----------
  // Hook up scene switching
  btnLeft.addEventListener("click", () => {
    sceneManager.goPrev();
    updateSceneButtons();
    updateScenePhysics();
  });

  btnRight.addEventListener("click", () => {
    sceneManager.goNext();
    updateSceneButtons();
    updateScenePhysics();
  });

  function updateSceneButtons() {
    const index = sceneManager.getCurrentSceneIndex();
    const count = sceneManager.getSceneCount();

    btnLeft.style.display = index > 0 ? "block" : "none";
    btnRight.style.display = index < count - 1 ? "block" : "none";
  }
  // #endregion

  // #region - Drag & Drop Mechanics ----------
  // Variables
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let dragging = false;
  let inventoryDiv: HTMLElement | null = null;
  let inInventory = false;

  // Update mouse coordinates from event
  function updateMouseFromEvent(evt: MouseEvent) {
    // Use canvas bounding rect in case the canvas is scaled
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // Listen for mouse down
  renderer.domElement.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; // Only accept left click

    updateMouseFromEvent(event as MouseEvent);

    // Check if raycaster hits cube
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(mainCube);

    if (intersects.length > 0) {
      dragging = true;
      saveManager.setDragging(true);
      inInventory = false;
      physics.removeMesh(mainCube);
      physicsActive = false;
      setCursor("grabbing");

      if (inventoryDiv) {
        inventoryDiv.classList.add("dragging");
        // While dragging, allow the 3D canvas to render above the inventory
        inventoryDiv.style.pointerEvents = "none";
      }
      renderer.domElement.style.zIndex = "1100";
    }
  });

  // Listen for mouse move
  renderer.domElement.addEventListener("mousemove", (event) => {
    updateMouseFromEvent(event as MouseEvent);

    // Update cursor when hovering over the cube (on canvas only)
    try {
      raycaster.setFromCamera(mouse, camera);
      if (dragging) {
        setCursor("grabbing");
        // Highlight inventory when pointer is over it while dragging
        if (inventoryDiv) {
          const rect = inventoryDiv.getBoundingClientRect();
          const px = event.clientX;
          const py = event.clientY;
          const inside = px >= rect.left && px <= rect.right &&
            py >= rect.top && py <= rect.bottom;
          if (inside) inventoryDiv.classList.add("over");
          else inventoryDiv.classList.remove("over");
        }
      } else if (mainCube.visible) {
        const hit = raycaster.intersectObject(mainCube);
        if (hit.length > 0) {
          setCursor("grab");
          // Show silhouette outline
          setOutline(mainCube, true);
          mainCube.userData.isHovered = true;
        } else {
          setCursor("");
          // Hide outline
          setOutline(mainCube, false);
          mainCube.userData.isHovered = false;
        }
      } else {
        setCursor("");
      }
    } catch (_e) {
      // Ignore raycast errors during init
    }
  });

  // Listen for mouse up
  function handlePointerUp(event: MouseEvent) {
    // Update normalized mouse coords from the event before raycasting
    updateMouseFromEvent(event);

    if (dragging) {
      const invRect = inventoryDiv
        ? inventoryDiv.getBoundingClientRect()
        : null;
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const overInventory = invRect !== null &&
        mouseX >= invRect.left &&
        mouseX <= invRect.right &&
        mouseY >= invRect.top &&
        mouseY <= invRect.bottom;

      if (overInventory) {
        inInventory = true;
        mainCube.visible = false;
        createInvItem("#00ff00");
      } else {
        mainCube.visible = true;
        if (!physicsActive) {
          if (mainCube.userData.physicsBody) {
            physics.removeMesh(mainCube);
            mainCube.userData.physicsBody = null;
          }
          physics.addMesh(mainCube, 1);
          physicsActive = true;
        }
      }

      if (inventoryDiv) {
        inventoryDiv.classList.remove("dragging");
        inventoryDiv.classList.remove("over");
        inventoryDiv.style.pointerEvents = "auto";
      }

      // Restore canvas stacking and clear hover/outline
      renderer.domElement.style.zIndex = "";

      // Always clear hover/outline state explicitly on drop
      mainCube.userData.isHovered = false;
      setOutline(mainCube, false);

      dragging = false;
      saveManager.setDragging(false);

      // Do a final raycast using the updated mouse to set the cursor/outline correctly
      try {
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.intersectObject(mainCube);
        if (hit.length > 0 && mainCube.visible) {
          setCursor("grab");
          setOutline(mainCube, true);
          mainCube.userData.isHovered = true;
        } else {
          setCursor("");
          setOutline(mainCube, false);
          mainCube.userData.isHovered = false;
        }
      } catch (_e) {
        setCursor("");
      }
    }
  }

  renderer.domElement.addEventListener("mouseup", handlePointerUp);
  // Listen on window so releasing outside the canvas still ends dragging
  globalThis.addEventListener("mouseup", handlePointerUp);

  // Hover state helper
  function updateHoverState() {
    // No hover while dragging
    if (dragging) {
      setOutline(mainCube, false);
      setCursor("grabbing");
      return;
    } else {
      setCursor("");
    }

    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObject(mainCube, false);

    const hovered = hit.length > 0 && mainCube.visible;

    if (hovered) {
      setCursor("grab");
      setOutline(mainCube, true);
    } else {
      setCursor("");
      setOutline(mainCube, false);
    }

    mainCube.userData.isHovered = hovered;
  }

  // Outline helper
  function setOutline(mesh: THREE.Mesh, on: boolean) {
    const outline = mesh.userData.outline;
    if (!outline) return;
    outline.visible = on;
  }

  // Cursor helper
  function setCursor(c: string) {
    renderer.domElement.style.cursor = c;
    try {
      document.body.style.cursor = c;
    } catch (_e) {
      // Ignore if document.body isn't writable
    }
  }

  // #endregion

  // #region - Animation Loop ----------
  let successShown = false;
  function animate(time = lastTime) {
    requestAnimationFrame(animate);

    const deltaTime = (time - lastTime) * 0.001; // Convert ms to seconds
    lastTime = time;

    updateHoverState();

    // Drag cube
    if (dragging) {
      raycaster.setFromCamera(mouse, camera);

      // Create a drag plane perpendicular to the camera
      const planeNormal = new THREE.Vector3();
      camera.getWorldDirection(planeNormal);
      const plane = new THREE.Plane(
        planeNormal,
        -planeNormal.dot(mainCube.position),
      );

      // Make cube follow the cursor position
      const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (point) {
        // Keep cube above ground
        const groundTop = ground1.position.y + ground1.scale.y;

        if (point.y < groundTop) {
          point.y = groundTop;
        }

        // Set cube position to cursor
        mainCube.position.copy(point);
      }
      mainCube.userData.kinematic = true;
    } else {
      mainCube.userData.kinematic = false;
    }

    // Update camera and rendering
    if (enableCameraControls) {
      cameraControls?.update();
    }

    const currentScene = sceneManager.getCurrentScene();
    if (currentScene) {
      const delta = deltaTime;
      currentScene.physics.update(delta);
      renderer.render(currentScene.scene, camera);
    }

    // Puzzle success
    if (
      currentScene &&
      currentScene.getMeshes().includes(winGround) &&
      currentScene.getMeshes().includes(mainCube) &&
      isTouching(mainCube, winGround) &&
      !successShown
    ) {
      showText("success", "SUCCESS! You landed it! 🎉", "lime");
      successShown = true;
    }

    // Puzzle fail
    if (
      currentScene &&
      currentScene.getMeshes().includes(failGround) &&
      currentScene.getMeshes().includes(mainCube) &&
      isTouching(mainCube, failGround)
    ) {
      showText("fail", "That's not right... TRY AGAIN", "red");
      successShown = false;
    }
  }

  // Create inventory DOM early so SaveManager can be instantiated before load
  const InvBox = document.createElement("div");
  InvBox.id = "inventory";
  InvBox.className = "inventory";
  document.body.appendChild(InvBox);
  inventoryDiv = InvBox;

  // Create SaveManager to handle persistence and autosave
  const saveManager = new SaveManager({
    sceneManager,
    physics,
    mainCube,
    invBox: InvBox,
    renderer,
    grounds: { ground1, ground2, winGround, failGround },
  });

  // Try to load saved game via SaveManager; if none, fall back to initial scene
  const loadedSave = saveManager.load();
  if (!loadedSave) {
    sceneManager.switchScene("room1");
  }
  // Sync inInventory state with cube visibility after load
  inInventory = !mainCube.visible;
  updateSceneButtons();
  updateScenePhysics();

  // Start auto-save via SaveManager
  try {
    saveManager.startAutoSave(5000);
  } catch (_e) {
    // If setInterval isn't available for any reason, skip auto-save
  }

  // Initial animate call
  animate();
  // #endregion

  // #region - Success Call ----------
  function isTouching(cube: THREE.Mesh, target: THREE.Mesh): boolean {
    const cubeBox = new THREE.Box3().setFromObject(cube);
    const targetBox = new THREE.Box3().setFromObject(target);
    return cubeBox.intersectsBox(targetBox);
  }

  function showText(elementID: string, message: string, _color: string) {
    const existing = document.getElementById(elementID);
    if (existing) {
      existing.remove();
    }
    const opposite = document.getElementById(
      elementID === "success" ? "fail" : "success",
    );
    if (opposite) {
      opposite.remove();
    }

    const el = document.createElement("div");
    el.id = elementID;
    el.textContent = message;
    el.className = `message ${elementID}`;
    document.body.appendChild(el);
  }
  // #endregion

  // #region - Inventory System ----------
  function createInvItem(color: string) {
    const existing = document.getElementById("invItem");
    if (existing) {
      existing.remove();
    }
    const item = document.createElement("div");
    item.id = "invItem";
    item.className = "inv-item";
    // Keep color dynamic
    item.style.background = color;
    InvBox.appendChild(item);
  }
  // Add event listener for pulling cube out of inventory
  inventoryDiv?.addEventListener("click", () => {
    if (!inInventory || dragging) return;

    // Remove visual item
    const existing = document.getElementById("invItem");
    if (existing) existing.remove();

    // Restore cube
    inInventory = false;
    mainCube.visible = true;
    mainCube.position
      .copy(camera.position)
      .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
    // Ensure the cube exists in the current active scene so it renders there
    const currentScene = sceneManager.getCurrentScene();
    if (currentScene) {
      // Remove from known scenes first to avoid duplicates
      try {
        scene1.removeMesh(mainCube);
      } catch (_e) {
        // Ignore
      }
      try {
        scene2.removeMesh(mainCube);
      } catch (_e) {
        // Ignore
      }

      // Add to current scene which will also register it with the physics engine
      currentScene.addMesh(mainCube, 1);
    } else {
      // Fallback: re-add to physics only
      physics.addMesh(mainCube, 1);
    }

    physicsActive = true;
  });
  // #endregion

  // #region - UI System ----------
  const ButtonsBox = document.createElement("div");
  ButtonsBox.id = "ui-buttons";
  ButtonsBox.className = "buttons-box";
  document.body.appendChild(ButtonsBox);

  // Language image button
  const langImg = document.createElement("img");
  langImg.src = "src/assets/Languages.png";
  langImg.alt = "Change Language";
  langImg.title = "Change Language";
  langImg.className = "ui-btn-img";
  ButtonsBox.appendChild(langImg);
  langImg.addEventListener("click", () => {
    alert("Language change feature is not implemented yet.");
  });

  // Light/dark mode image button
  const modeImg = document.createElement("img");
  modeImg.alt = "Toggle Light/Dark Mode";
  modeImg.title = "Toggle Light/Dark Mode";
  modeImg.className = "ui-btn-img";
  ButtonsBox.appendChild(modeImg);

  function updateModeIcon() {
    const isDark = InvBox.classList.contains("dark");
    // Show LightMode icon when currently dark (clicking will switch to light),
    // and show DarkMode icon when currently light.
    modeImg.src = isDark ? "src/assets/LightMode.png" : "src/assets/DarkMode.png";
    // Also ensure the buttons box knows about dark mode so we can style icons
    if (isDark) {
      ButtonsBox.classList.add("dark");
      btnLeft.style.color = "white";
      btnLeft.style.backgroundColor = "rgba(153, 153, 153, 1.0)";
      btnRight.style.color = "white";
      btnRight.style.backgroundColor = "rgba(153, 153, 153, 1.0)";
    } else {
      ButtonsBox.classList.remove("dark");
      btnLeft.style.color = "black";
      btnLeft.style.backgroundColor = "rgba(102, 102, 102, 1.0)";
      btnRight.style.color = "black";
      btnRight.style.backgroundColor = "rgba(102, 102, 102, 1.0)";
    }
  }

  modeImg.addEventListener("click", () => {
    const current = renderer.getClearColor(new THREE.Color());
    if (current.getHex() === 0xffffff) {
      renderer.setClearColor(0x000000, 1);
      InvBox.classList.add("dark");
      ButtonsBox.classList.add("dark");
    } else {
      renderer.setClearColor(0xffffff, 1);
      InvBox.classList.remove("dark");
      ButtonsBox.classList.remove("dark");
    }
    updateModeIcon();
  });

  // Reset image button
  const resetImg = document.createElement("img");
  resetImg.src = "src/assets/Reset.png";
  resetImg.alt = "Reset Game";
  resetImg.title = "Reset Game";
  resetImg.className = "ui-btn-img";
  ButtonsBox.appendChild(resetImg);
  resetImg.addEventListener("click", () => {
    saveManager.reset();
    updateSceneButtons();
    updateModeIcon();
  });

  // Save image button
  const saveImg = document.createElement("img");
  saveImg.src = "src/assets/Save.png";
  saveImg.alt = "Save Game";
  saveImg.title = "Save Game";
  saveImg.className = "ui-btn-img";
  ButtonsBox.appendChild(saveImg);
  saveImg.addEventListener("click", () => {
    saveManager.save();
    console.log("[Manual] Save triggered");
  });

  // Initialize mode icon to current state
  updateModeIcon();

  // #endregion

  // Save/Load/Reset handled by SaveManager
})();
