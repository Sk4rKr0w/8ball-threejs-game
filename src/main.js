import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

//--------------------------------------//
// Creating a scene, camera and renderer
//--------------------------------------//
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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

//-----------------------//
// Creating OrbitControls
//-----------------------//
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
camera.position.set(5, 5, 0);
controls.target.set(0, 2.5, 0);
controls.update();

//-----------------------------------------------//
// Importing 8Pool Table and creating ball array
//-----------------------------------------------//
const loader = new GLTFLoader();
loader.load("/models/billiards/scene.gltf", (gltf) => {
    const table = gltf.scene;

    let tableMesh = null;

    table.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
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

// --------------------------//
// Adding Lights to the scene
// --------------------------//
const ambientLight = new THREE.AmbientLight("white", 0.075);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight("white", 50);
spotLight.position.set(0, 5.75, 0);
spotLight.angle = Math.PI / 2.75;
spotLight.penumbra = 0.7;
spotLight.decay = 2;
spotLight.distance = 10;
spotLight.castShadow = true;

spotLight.shadow.bias = -0.0005;
spotLight.shadow.radius = 4;

spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;

scene.add(spotLight);

// --------------------------//
// Setting Event Listeners
// --------------------------//
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Camera Buttons
const cameraTargetPosition = new THREE.Vector3();
cameraTargetPosition.copy(camera.position);
let isCameraMoving = false;

document.getElementById("reset-camera-btn").addEventListener("click", () => {
    cameraTargetPosition.set(5, 5, 0);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

document.getElementById("top-view-btn").addEventListener("click", () => {
    cameraTargetPosition.set(1.5, 5, 0);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

document.getElementById("front-view-btn").addEventListener("click", () => {
    cameraTargetPosition.set(0, 4, 5);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

document.getElementById("back-view-btn").addEventListener("click", () => {
    cameraTargetPosition.set(0, 4, -5);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

// Resetting Balls Triangle
document.getElementById("ball-triangle-btn").addEventListener("click", () => {
    // 1 - Removing all the ball from the scene
    balls.forEach((ball) => {
        scene.remove(ball.mesh);
    });
    balls.length = 0;

    // 2 - New white ball
    whiteBall = new Ball(0.075, new THREE.Vector3(0, 2.55, -1.5));
    balls.push(whiteBall);

    // 3 - Create a new Triangle
    createTriangleBalls();

    // 4 - Resetting Stick Angle
    stickAngle = Math.PI / 2;
});

// "Take a Shot" Dummy Test:
// Shoots the white ball to a random position by setting its velocity
document.getElementById("dummy-test-btn").addEventListener("click", () => {
    const randomSpeed = 20;
    const vx = (Math.random() * 2 - 1) * randomSpeed;
    const vz = (Math.random() * 2 - 1) * randomSpeed;
    whiteBall.velocity.set(vx, 0, vz);
});

window.addEventListener("keydown", (event) => {
    const rotationSpeed = 0.05;

    // Rotating the Cue Stick clockwise
    if (event.key === "ArrowLeft") {
        stickAngle += rotationSpeed * 1.5;
    }
    // Rotating the Cue Stick counter-clockwise
    else if (event.key === "ArrowRight") {
        stickAngle -= rotationSpeed * 1.5;
    }
    // Hitting the ball with the cue stick
    else if (event.key === "Enter") {
        if (whiteBall.velocity.distanceTo(new THREE.Vector3(0, 0, 0)) < 0.01) {
            animateStickShot(() => {
                let direction = new THREE.Vector3();
                direction.subVectors(
                    whiteBall.mesh.position,
                    new THREE.Vector3(stick.position.x, 2.55, stick.position.z)
                );
                direction.normalize();
                let force = direction.clone().multiplyScalar(10);
                whiteBall.velocity = force;
            });
        } else {
            console.log("Ball is already in motion");
        }
    }
});

// ------------------------------ //
// Ball Class + Setting Balls Position
// ------------------------------ //
class Ball {
    constructor(radius, initialPosition, texture = null) {
        this.geometry = new THREE.SphereGeometry(radius, 32, 32);

        this.material = new THREE.MeshStandardMaterial({
            metalness: 0.5,
            roughness: 0.2,
            map: texture,
        });

        this.material.toneMapped = false;
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.position.copy(initialPosition);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);

        this.mass = 0.21;
        scene.add(this.mesh);
    }

    update(deltaTime) {
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        handleTableCollision(this);

        this.angularVelocity.copy(
            new THREE.Vector3()
                .crossVectors(this.velocity, new THREE.Vector3(0, 1, 0))
                .divideScalar(this.geometry.parameters.radius)
        );

        this.mesh.rotation.x += this.angularVelocity.x * deltaTime;
        this.mesh.rotation.y += this.angularVelocity.y * deltaTime;
        this.mesh.rotation.z += this.angularVelocity.z * deltaTime;

        // Simulates friction by reducing the velocity by 1.75% each frame
        this.velocity.multiplyScalar(0.9825);
        this.angularVelocity.multiplyScalar(0.9825);
    }
}

//----------------------------------------------//
// Creating Balls + Texture and Triangle Positioning
//----------------------------------------------//
const ballRadius = 0.075;
const spacing = ballRadius * 2.05;
const triangleStart = new THREE.Vector3(0.5, 2.55, 0);
const balls = [];

let whiteBall = new Ball(0.075, new THREE.Vector3(0, 2.55, -1.5));
balls.push(whiteBall);

function createTriangleBalls() {
    let index = 0;
    const rows = 5;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col <= row; col++) {
            const z = triangleStart.x + (row * spacing * Math.sqrt(3)) / 2;
            const x = triangleStart.z + (col - row / 2) * spacing;
            const pos = new THREE.Vector3(x, 2.55, z);

            const ball = new Ball(ballRadius, pos, ballTextures[index]);

            balls.push(ball);
            index++;
        }
    }
}

//------------------------------//
// Applying balls textures
//------------------------------//
const textureLoader = new THREE.TextureLoader();
const ballTextures = [];

for (let i = 1; i <= 15; i++) {
    const texture = textureLoader.load(
        `/models/billiards/textures/balls/ball${i}.png`
    );
    texture.encoding = THREE.sRGBEncoding;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    ballTextures.push(texture);
}

createTriangleBalls();

//------------------------------//
// Ball-Table Collision Handler
//------------------------------//
const tableWidth = 2.7;
const tableLength = 6.3;

const tableMinX = -tableWidth / 2;
const tableMaxX = tableWidth / 2;

const tableMinZ = -tableLength / 2;
const tableMaxZ = tableLength / 2;

function handleTableCollision(ball) {
    const r = ball.geometry.parameters.radius;

    // X-Axis Collision
    if (ball.mesh.position.x - r < tableMinX) {
        ball.mesh.position.x = tableMinX + r;
        ball.velocity.x = -ball.velocity.x * 0.9; // Opposite Direction + Minor Velocity
    } else if (ball.mesh.position.x + r > tableMaxX) {
        ball.mesh.position.x = tableMaxX - r;
        ball.velocity.x = -ball.velocity.x * 0.9;
    }

    // Z-Axis Collision
    if (ball.mesh.position.z - r < tableMinZ) {
        ball.mesh.position.z = tableMinZ + r;
        ball.velocity.z = -ball.velocity.z * 0.9;
    } else if (ball.mesh.position.z + r > tableMaxZ) {
        ball.mesh.position.z = tableMaxZ - r;
        ball.velocity.z = -ball.velocity.z * 0.9;
    }
}

//-----------------------------//
// Ball-Ball Collision Handler
//-----------------------------//
function areBallsColliding(ball1, ball2) {
    const distance = ball1.mesh.position.distanceTo(ball2.mesh.position);
    return (
        distance <=
        ball1.geometry.parameters.radius + ball2.geometry.parameters.radius
    );
}

function resolveCollision(ball1, ball2) {
    const normal = new THREE.Vector3().subVectors(
        ball2.mesh.position,
        ball1.mesh.position
    );
    const distance = normal.length();
    const radiusSum =
        ball1.geometry.parameters.radius + ball2.geometry.parameters.radius;

    if (distance === 0) {
        normal.set(1, 0, 0);
    } else {
        normal.divideScalar(distance);
    }

    const overlap = radiusSum - distance;
    if (overlap > 0) {
        ball1.mesh.position.addScaledVector(normal, -overlap / 2);
        ball2.mesh.position.addScaledVector(normal, overlap / 2);

        const v1n = normal.dot(ball1.velocity);
        const v2n = normal.dot(ball2.velocity);

        const e = 0.8;
        const m1 = ball1.mass;
        const m2 = ball2.mass;

        const v1nFinal =
            (m1 * v1n + m2 * v2n - e * m2 * (v1n - v2n)) / (m1 + m2);
        const v2nFinal =
            (m1 * v1n + m2 * v2n + e * m1 * (v1n - v2n)) / (m1 + m2);

        const v1nChange = v1nFinal - v1n;
        const v2nChange = v2nFinal - v2n;

        ball1.velocity.addScaledVector(normal, v1nChange);
        ball2.velocity.addScaledVector(normal, v2nChange);

        // Ball Rotations
        // TO-DO: Update Comments
        // Punto di contatto medio
        const contactPoint = new THREE.Vector3()
            .addVectors(ball1.mesh.position, ball2.mesh.position)
            .multiplyScalar(0.5);

        // Leve vettoriali dal centro palla al punto di contatto
        const r1 = new THREE.Vector3().subVectors(
            contactPoint,
            ball1.mesh.position
        );
        const r2 = new THREE.Vector3().subVectors(
            contactPoint,
            ball2.mesh.position
        );

        // Impulso lineare scalare
        const impulseScalar = Math.abs(v1nChange) * m1;

        // Calcolo impulso rotazionale proporzionale alla leva e impulso lineare
        // Coefficiente di trasferimento spin arbitrario (0.2 come esempio)
        const spinTransferCoeff = 0.2;

        // Impulso rotazionale per ogni palla (vettore)
        const angularImpulse1 = new THREE.Vector3()
            .crossVectors(r1, normal)
            .multiplyScalar(impulseScalar * spinTransferCoeff);
        const angularImpulse2 = new THREE.Vector3()
            .crossVectors(r2, normal)
            .multiplyScalar(impulseScalar * spinTransferCoeff);

        // Aggiorna velocità angolare (spin)
        ball1.angularVelocity.add(angularImpulse1);
        ball2.angularVelocity.sub(angularImpulse2);
    }
}

//-----------------------------------//
// Creating Pocket HitBoxes for score
//-----------------------------------//
const pocketRadius = 0.25;

const pockets = [];
let score = 0;
const pocketPositions = [
    new THREE.Vector3(tableMinX + 0.05, 2.45, tableMinZ + 0.05), // TOP RIGHT
    new THREE.Vector3(tableMinX + 0.05, 2.45, tableMaxZ - 0.05), // TOP LEFT
    new THREE.Vector3(tableMaxX - 0.05, 2.45, tableMinZ + 0.05), // BOTTOM RIGHT
    new THREE.Vector3(tableMaxX - 0.05, 2.45, tableMaxZ - 0.05), // BOTTOM LEFT
    new THREE.Vector3(tableMinX - 0.15, 2.45, 0), // CENTER TOP
    new THREE.Vector3(tableMaxX + 0.15, 2.45, 0), // CENTER BOTTOM
];

pocketPositions.forEach((pos) => {
    const pocket = {
        position: pos,
        radius: pocketRadius,
    };
    pockets.push(pocket);
});

function checkBallInPocket(ball) {
    for (let pocket of pockets) {
        const dist = ball.mesh.position.distanceTo(pocket.position);
        if (dist < ball.geometry.parameters.radius + pocket.radius) {
            return true;
        }
    }
    return false;
}

function removeBall(ball) {
    scene.remove(ball.mesh);
    const index = balls.indexOf(ball);
    if (index > -1) {
        balls.splice(index, 1);
    }
}

//--------------------------------------------------//
// Debugger for Pockets (uncomment to see hitboxes)
//--------------------------------------------------//

/*
const debugPocketMeshes = [];

pocketPositions.forEach((pos) => {
    const geometry = new THREE.SphereGeometry(pocketRadius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        opacity: 0.5,
        transparent: true,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(pos);
    scene.add(sphere);
    debugPocketMeshes.push(sphere);
});
*/

//---------------------------//
// Adding Stick to the scene
//----------------------------//

let stick;

loader.load("/models/billiard_cue/scene.gltf", (gltf) => {
    stick = gltf.scene;
    stick.position.y = 2.55;
    stick.scale.set(2, 1, 1);
    scene.add(stick);
});

//----------------------------//
// Adjusting Stick Positioning
//----------------------------//
let stickAngle = Math.PI / 2;
let stickRadius = -1.75; // Distance from White Ball

function adjustStickPosition() {
    if (!stick || !whiteBall) return;

    const center = whiteBall.mesh.position;

    // Setting Stick Position around White Ball
    stick.position.x = center.x + stickRadius * Math.cos(stickAngle);
    stick.position.z = center.z + stickRadius * Math.sin(stickAngle);
    stick.position.y = 2.6;

    // Computing Angle Y used to let the stick follow the white ball
    // Stick-WhiteBall Vector
    const direction = new THREE.Vector3();
    direction.subVectors(center, stick.position);
    direction.y = 0; // Ignora altezza per rotazione solo sull'asse Y
    direction.normalize();

    const angleY = Math.atan2(direction.x, direction.z);
    const tiltAngle = 0.025; // Usefull to give a little tilt to the stick

    // Rotation around the Y-Axis
    stick.rotation.set(tiltAngle, angleY + Math.PI, 0);

    // Making the stick "pointing" at the white ball
    stick.rotation.y += Math.PI / 2;
}

//--------------------------------------------//
// Adding Cue Stick "Animation" for the shoot
//--------------------------------------------//
function animateStickShot(callback) {
    const duration = 150;
    const retreatDelay = 75;
    const retreatDuration = 150;

    const start = -1.75;
    const end = -1.5;

    const startTime = performance.now();

    function animateForward(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        stickRadius = start + (end - start) * t;

        if (t < 1) {
            requestAnimationFrame(animateForward);
        } else {
            if (callback) callback(); // 💥 Esegui qui la forza, al momento dell'impatto
            setTimeout(() => {
                const retreatStart = performance.now();
                function animateBackward(nowRetreat) {
                    const elapsedBack = nowRetreat - retreatStart;
                    const tBack = Math.min(elapsedBack / retreatDuration, 1);
                    stickRadius = end + (start - end) * tBack;
                    if (tBack < 1) {
                        requestAnimationFrame(animateBackward);
                    } else {
                        stickRadius = start;
                    }
                }
                requestAnimationFrame(animateBackward);
            }, retreatDelay);
        }
    }

    requestAnimationFrame(animateForward);
}

//----------------------------------------//
// Adding Trajectory Line Stick-WhiteBall
//----------------------------------------//

// TO-DO //

//-----------------------//
// Initialize Clock
//-----------------------//
const clock = new THREE.Clock();

// ----------------------------------//
// Animation Loop + Helper Functions //
// ----------------------------------//

function animate() {
    const deltaTime = clock.getDelta();

    balls.forEach((ball) => ball.update(deltaTime));

    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            if (areBallsColliding(balls[i], balls[j])) {
                resolveCollision(balls[i], balls[j]);
            }
        }
    }

    balls.forEach((ball) => {
        if (checkBallInPocket(ball) && ball !== whiteBall) {
            removeBall(ball);
            score++;
            console.log("Palla in Buca!! Il tuo punteggio: " + score);
        }
    });

    if (isCameraMoving) {
        camera.position.lerp(cameraTargetPosition, 0.05);
        if (camera.position.distanceTo(cameraTargetPosition) < 0.01) {
            isCameraMoving = false;
        }
    }

    if (whiteBall.velocity.distanceTo(new THREE.Vector3(0, 0, 0)) < 0.01) {
        adjustStickPosition();
    }

    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
