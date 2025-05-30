import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Creating a scene, camera and renderer
const canvas = document.querySelector("canvas#threejs");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Abilita le ombre
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Creating OrbitControls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
camera.position.set(5, 5, 0);
controls.target.set(0, 2.5, 0);
controls.update();

// Variabile globale per la bounding box del tavolo
let tableBox = null;

// Importing 8Pool Table and creating ball array
const loader = new GLTFLoader();
loader.load("/models/billiards/scene.gltf", (gltf) => {
    const table = gltf.scene;

    let tableMesh = null;

    table.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true; // Proietta ombre
            child.receiveShadow = true; // Riceve ombre
        }

        const name = child.name.toLowerCase();

        if (
            name.includes("pool_stick_grp") ||
            name.includes("pool_balls_grp")
        ) {
            child.visible = false;
        }

        if (name.includes("green")) {
            tableMesh = child;
        }
    });

    scene.add(table);
    console.log(table);
    console.log("Modello caricato!");
});

// Adding plane for table
const planeGeometry = new THREE.PlaneGeometry(2.75, 6.35);
const planeMaterial = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    visible: false,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.y = 2.5;
plane.rotation.x = Math.PI / 2;
scene.add(plane);

// Adding Lights to the scene
const ambientLight = new THREE.AmbientLight("white", 0.75);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight("white", 50);
spotLight.position.set(0, 5.5, 0);
spotLight.angle = Math.PI / 3.5;
spotLight.penumbra = 1;
spotLight.distance = 5;
spotLight.castShadow = true;

spotLight.shadow.bias = -0.0005;
spotLight.shadow.radius = 4;

scene.add(spotLight);

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
};

const speed = 0.1;

window.addEventListener("keydown", (event) => {
    switch (event.key.toLowerCase()) {
        case "w":
        case "arrowup":
            keysPressed.forward = true;
            break;
        case "s":
        case "arrowdown":
            keysPressed.backward = true;
            break;
        case "a":
        case "arrowleft":
            keysPressed.left = true;
            break;
        case "d":
        case "arrowright":
            keysPressed.right = true;
            break;
        case " ":
            keysPressed.up = true;
            break;
        case "shift":
            keysPressed.down = true;
            break;
    }
});

window.addEventListener("keyup", (event) => {
    switch (event.key.toLowerCase()) {
        case "w":
        case "arrowup":
            keysPressed.forward = false;
            break;
        case "s":
        case "arrowdown":
            keysPressed.backward = false;
            break;
        case "a":
        case "arrowleft":
            keysPressed.left = false;
            break;
        case "d":
        case "arrowright":
            keysPressed.right = false;
            break;
        case " ":
            keysPressed.up = false;
            break;
        case "shift":
            keysPressed.down = false;
            break;
    }
});

function updateCameraMovement() {
    const moveDirection = new THREE.Vector3();

    // Forward Direction
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Right Direction
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // If statements to check for movement keys
    if (keysPressed.forward) moveDirection.add(forward);
    if (keysPressed.backward) moveDirection.sub(forward);
    if (keysPressed.right) moveDirection.add(right);
    if (keysPressed.left) moveDirection.sub(right);

    moveDirection.normalize().multiplyScalar(speed);
    camera.position.add(moveDirection);

    // OrbitControls updated with camera
    controls.target.add(moveDirection);
}

let targetCameraPosition = null;

document.getElementById("reset-camera-btn").addEventListener("click", () => {
    targetCameraPosition = new THREE.Vector3(5, 5, 0);
    controls.target.set(0, 2.5, 0);
});

document.getElementById("top-view-btn").addEventListener("click", () => {
    targetCameraPosition = new THREE.Vector3(1.5, 5, 0);
    controls.target.set(0, 2.5, 0);
});

document.getElementById("front-view-btn").addEventListener("click", () => {
    targetCameraPosition = new THREE.Vector3(0, 4, 5);
    controls.target.set(0, 2.5, 0);
});

document.getElementById("back-view-btn").addEventListener("click", () => {
    targetCameraPosition = new THREE.Vector3(0, 4, -5);
    controls.target.set(0, 2.5, 0);
});

function animate() {
    updateCameraMovement();
    if (targetCameraPosition) {
        camera.position.lerp(targetCameraPosition, 0.05); // 0.05 = speed

        if (camera.position.distanceTo(targetCameraPosition) < 0.01) {
            camera.position.copy(targetCameraPosition);
            targetCameraPosition = null;
        }
    }
    controls.update();

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
