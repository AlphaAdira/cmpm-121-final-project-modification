import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PhysicsEngine } from "./classes/PhysicsEngine.ts";
import { GameScene } from "./classes/GameScene.ts";
import { SceneManager } from "./classes/SceneManager.ts";

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


  // ---------- Scene Navigation Buttons ----------
  const btnLeft = document.createElement("div");
  btnLeft.innerHTML = "⟵";
  btnLeft.style.position = "absolute";
  btnLeft.style.left = "20px";
  btnLeft.style.top = "50%";
  btnLeft.style.transform = "translateY(-50%)";
  btnLeft.style.fontSize = "48px";
  btnLeft.style.cursor = "pointer";
  btnLeft.style.userSelect = "none";
  btnLeft.style.zIndex = "1000";
  btnLeft.style.display = "none"; // hidden by default
  btnLeft.style.color = "white";
  btnLeft.style.background = "rgba(0,0,0,0.45)";
  btnLeft.style.padding = "6px 10px";
  btnLeft.style.borderRadius = "8px";
  btnLeft.style.pointerEvents = "auto";
  document.body.appendChild(btnLeft);

  const btnRight = document.createElement("div");
  btnRight.innerHTML = "⟶";
  btnRight.style.position = "absolute";
  btnRight.style.right = "20px";
  btnRight.style.top = "50%";
  btnRight.style.transform = "translateY(-50%)";
  btnRight.style.fontSize = "48px";
  btnRight.style.cursor = "pointer";
  btnRight.style.userSelect = "none";
  btnRight.style.zIndex = "1000";
  btnRight.style.display = "none"; // hidden by default
  btnRight.style.color = "white";
  btnRight.style.background = "rgba(0,0,0,0.45)";
  btnRight.style.padding = "6px 10px";
  btnRight.style.borderRadius = "8px";
  btnRight.style.pointerEvents = "auto";
  document.body.appendChild(btnRight);


  // ---------- Camera Controls ----------
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75, // FOV
    globalThis.innerWidth / globalThis.innerHeight, // Aspect
    0.1, // Near
    1000, // Far
  );
  camera.position.z = 10;

  // Create renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add camera orbit controls
  let cameraControls: OrbitControls | null = null;
  if (enableCameraControls) {
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true;
    cameraControls.dampingFactor = 0.05;

    // Set camera controls
    cameraControls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY, // Zoom
      RIGHT: THREE.MOUSE.ROTATE, // Orbit camera
    };

    cameraControls.update();
  }

  // ---------- Scene Objects ----------
  // Create scenes
  const scene1 = new GameScene(physics);
  const scene2 = new GameScene(physics);

  // Add lighting
  const light1 = new THREE.AmbientLight(0xffffff, 1);
  scene1.addLight(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1);
  light2.position.set(1, 1, 1);
  scene2.addLight(light2);

  // Add a static ground
  const ground1 = physics.addBox(
    new THREE.Vector3(20, 1, 20), // Ground size
    new THREE.Vector3(0, -5, 0), // Starting position
    0,  // Mass (0 = static object)
    0x4444ff, // Blue
  );
  scene1.addMesh(ground1);

  const ground2 = physics.addBox(
    new THREE.Vector3(20, 1, 20), // Ground size
    new THREE.Vector3(0, -5, 0),  // Starting position
    0, // Mass (0 = static object)
    0x777777, // Gray
  );
  scene2.addMesh(ground2);

  // Add a target ground
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
    new THREE.Vector3(0, 5, 0), // Starting position
    1, // Mass
    0x00ff00, // Color
  );
  scene1.addMesh(mainCube);
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


  // ---------- Scene Navigation Logic ----------
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


  // ---------- Drag & Drop Mechanics ----------
  // Variables
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let dragging = false;
  // inventoryDiv will be created later — declare it now so handlers can safely check it.
  let inventoryDiv: HTMLElement | null = null;
  let inInventory = false;

  // Listen for mouse down
  renderer.domElement.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; // Only accept left click

    // Normalize mouse coordinates
    mouse.x = (event.clientX / globalThis.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / globalThis.innerHeight) * 2 + 1;

    // Check if raycaster hits cube
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(mainCube);

    if (intersects.length > 0) {
      dragging = true;
      inInventory = false; // In case we're pulling from inventory
      physics.removeMesh(mainCube);
      physicsActive = false;
    }
  });

  // Listen for mouse move
  renderer.domElement.addEventListener("mousemove", (event) => {
    // Update normalized mouse coordinates every frame
    mouse.x = (event.clientX / globalThis.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / globalThis.innerHeight) * 2 + 1;
  });

  // Listen for mouse up
  renderer.domElement.addEventListener("mouseup", (event: MouseEvent) => {
    if (dragging) {
      // inventoryDiv can be null (not created) — treat as not over inventory
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
      dragging = false;
    }
  });

  // ---------- Animation Loop ----------
  let successShown = false;
  function animate(time = lastTime) {
    requestAnimationFrame(animate);

    const deltaTime = (time - lastTime) * 0.001; // Convert ms → seconds
    lastTime = time;

    if (physics.isReady()) {
      // Use the public update() method rather than reaching into the private internals
      physics.update(deltaTime);
    }

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
    // Puzzle success — only consider targets that are part of the active scene
    if (
      currentScene &&
      currentScene.getMeshes().includes(winGround) &&
      isTouching(mainCube, winGround) &&
      !successShown
    ) {
      showText("success", "SUCCESS! You landed it! 🎉", "lime");
      successShown = true;
    }

    // Puzzle fail — only consider targets that are part of the active scene
    if (
      currentScene &&
      currentScene.getMeshes().includes(failGround) &&
      isTouching(mainCube, failGround)
    ) {
      showText("fail", "That's not right... TRY AGAIN", "red");
      successShown = false;
    }
  }

  // Set initial scene
  sceneManager.switchScene("room1");
  updateSceneButtons();
  updateScenePhysics();

  // Initial animate call
  animate();

  // ------- Success Call ----------
  function isTouching(cube: THREE.Mesh, target: THREE.Mesh): boolean {
    const cubeBox = new THREE.Box3().setFromObject(cube);
    const targetBox = new THREE.Box3().setFromObject(target);
    return cubeBox.intersectsBox(targetBox);
  }

  function showText(elementID: string, message: string, color: string) {
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
    el.style.position = "absolute";
    el.style.top = "35%";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.color = color;
    el.style.fontSize = "32px";
    el.style.fontWeight = "bold";
    el.style.textShadow = "2px2px4px #000";
    el.style.zIndex = "1000";
    el.style.pointerEvents = "none";
    el.style.transition = "opacity1.5s ease-out";
    document.body.appendChild(el);
  }

  // ------- Inventory System ----------
  const InvBox = document.createElement("div");
  InvBox.id = "inventory";
  InvBox.style.position = "absolute";
  InvBox.style.top = "20px";
  InvBox.style.left = "20px";
  InvBox.style.width = "150px";
  InvBox.style.height = "150px";
  InvBox.style.background = "#E2EAF4";
  InvBox.style.borderRadius = "30px";
  InvBox.style.color = "black";
  InvBox.style.zIndex = "1";
  InvBox.style.pointerEvents = "none";
  document.body.appendChild(InvBox);
  // Set the inventoryDiv reference now that the element exists
  inventoryDiv = InvBox;

  function createInvItem(color: string) {
    const existing = document.getElementById("invItem");
    if (existing) {
      existing.remove();
    }
    const item = document.createElement("div");
    item.id = "invItem";
    item.style.width = "50px";
    item.style.height = "50px";
    item.style.background = color;
    item.style.margin = "10px auto";
    item.style.borderRadius = "10px";
    item.style.pointerEvents = "auto";
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
      // Remove from known scenes first to avoid duplicates (safe no-op if not present)
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
})();
