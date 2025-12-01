import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PhysicsEngine } from "./classes/PhysicsEngine.ts";
import { GameScene } from "./classes/GameScene.ts";
import { SceneManager } from "./classes/GameScene.ts";

// ---------- Settings ----------
const enableCameraControls = false;

// ---------- Main Program ----------
// Wrap in async IIFE to support older browsers
(async () => {
  // Create global physics variables
  const physics = new PhysicsEngine();
  await physics.init();

  // Create global scene manager
  const sceneManager = new SceneManager();

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

  // Add lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 1);
  light1.position.set(1, 1, 1);
  scene1.addLight(light1);

  // Add a static ground
  const ground1 = physics.addBox(
    new THREE.Vector3(20, 1, 20), // Ground size
    new THREE.Vector3(0, -5, 0), // Starting position
    0, // Mass (0 = static object)
    0x777777, // Gray
  );
  scene1.addMesh(ground1);

  // Add a target ground
  const winGround = physics.addBox(
    new THREE.Vector3(5, 1, 20), // Win ground size
    new THREE.Vector3(5, -4, 0), // Starting position
    0, // Mass (0 = static object)
    0x22aa22, // Green
  );
  scene1.addMesh(winGround);

  // Add a fail ground
  const failGround = physics.addBox(
    new THREE.Vector3(5, 1, 20), // Fail ground size
    new THREE.Vector3(-5, -4, 0), // Starting position
    0, // Mass (0 = static object)
    0xaa2222, // Red
  );
  scene1.addMesh(failGround);

  // Add an interactive physics cube
  const mainCube = physics.addBox(
    new THREE.Vector3(1, 1, 1), // Cube size
    new THREE.Vector3(0, 5, 0), // Starting position
    1, // Mass
    0x00ff00, // Color
  );
  scene1.addMesh(mainCube);

  // Add scenes to scene manager
  sceneManager.addScene("room1", scene1);

  // ---------- Drag & Drop Mechanics ----------
  // Variables
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let dragging = false;
  const inventoryDiv = document.getElementById("inventory")!;
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

      physics.removeMesh(mainCube);
    }
  });

  // Listen for mouse move
  renderer.domElement.addEventListener("mousemove", (event) => {
    // Update normalized mouse coordinates every frame
    mouse.x = (event.clientX / globalThis.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / globalThis.innerHeight) * 2 + 1;
  });

  // Listen for mouse up
  renderer.domElement.addEventListener("mouseup", () => {
    if (dragging) {
      const invRect = inventoryDiv.getBoundingClientRect();
      const overInventory = // Check if mouse is over inventory
        mouse.x >= (invRect.left / globalThis.innerWidth) * 2 - 1 &&
        mouse.x <= (invRect.right / globalThis.innerWidth) * 2 - 1 &&
        mouse.y >= -(invRect.bottom / globalThis.innerHeight) * 2 + 1 &&
        mouse.y <= -(invRect.top / globalThis.innerHeight) * 2 + 1;

      if (overInventory) {
        // ✅ Drop into inventory
        inInventory = true;
        mainCube.visible = false;
        physics.removeMesh(mainCube); // Stop physics
        createInvItem("#00ff00");
      } else {
        physics.addMesh(mainCube, 1);
        physics.cleanupOrphanBodies(scene);
      }
      dragging = false;
    }
  });

  // ---------- Animation Loop ----------
  let successShown = false;
  function animate() {
    requestAnimationFrame(animate);

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
    } else {
      mainCube.userData.kinematic = false;
    }

    // Update camera and rendering
    if (enableCameraControls) {
      cameraControls?.update();
    }
    const currentScene = sceneManager.getCurrentScene();
    if (currentScene) {
      renderer.render(currentScene.scene, camera);
    }

    // Puzzle success
    if (isTouching(mainCube, winGround) && !successShown) {
      showText("success", "SUCCESS! You landed it! 🎉", "lime");
      successShown = true;
    }

    // Puzzle fail
    if (isTouching(mainCube, failGround)) {
      showText("fail", "That's not right... TRY AGAIN", "red");
      successShown = false;
    }
  }

  // Set initial scene
  sceneManager.switchScene("room1");

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

  // ------- Inventory ----------
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
    InvBox.appendChild(item);
  }
  // Add event listener for pulling cube out of inventory
  inventoryDiv.addEventListener("click", () => {
    const existing = document.getElementById("invItem");
    if (existing) {
      existing.remove();
    }
    if (inInventory && !dragging) {
      inInventory = false;
      mainCube.visible = true;
      mainCube.position.copy(camera.position).add(
        camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3),
      );
      physics.addMesh(mainCube, 1); // Re-enable physics
    }
  });
})();
