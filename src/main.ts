import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PhysicsEngine } from "./physics/PhysicsEngine.ts";

// Wrap in async IIFE to support older browsers
(async () => {
  // Create global physics variables
  const physics = new PhysicsEngine();
  await physics.init();

  // Create scene
  const scene = new THREE.Scene();

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
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);
  controls.update();

  // Add lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Add a static ground
  const ground = physics.addBox(
    new THREE.Vector3(20, 1, 20), // Ground size
    new THREE.Vector3(0, -5, 0), // Starting position
    0, // Mass (0 = static object)
    0x777777, // Gray
  );
  scene.add(ground);

  // Add a physics cube
  const cube = physics.addBox(
    new THREE.Vector3(1, 1, 1), // Cube size
    new THREE.Vector3(0, 5, 0), // Starting position
    1, // Mass
    0x00ff00, // Color
  );
  scene.add(cube);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();
