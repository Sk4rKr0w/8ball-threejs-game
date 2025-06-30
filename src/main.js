import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Pane } from "tweakpane";

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft and Realistic Shadows
renderer.outputEncoding = THREE.sRGBEncoding; // Colors more accurate

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
    console.log("Table Model Loaded Successfully!");
});

// --------------------------//
// Adding Lights to the scene
// --------------------------//
const ambientLight = new THREE.AmbientLight(0x2c2c2c, 0.05);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xfff2e5, 50);
spotLight.position.set(0, 5.75, 0);
spotLight.angle = Math.PI / 2.75;
spotLight.penumbra = 0.7;
spotLight.decay = 2;
spotLight.distance = 10;
spotLight.castShadow = true;

spotLight.shadow.bias = -0.0005;
spotLight.shadow.radius = 4;

spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight);

// --------------------------//
// Setting Event Listeners
// --------------------------//
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// HUD Button
let isHUDShowed = true;

document.getElementById("showHUD").addEventListener("click", () => {
    const buttonContainer = document.getElementById("button-container");
    const showHUD = document.getElementById("showHUD");
    const textSpan = showHUD.querySelector("span:first-child");
    const iconSpan = showHUD.querySelector("span:last-child");

    if (isHUDShowed) {
        buttonContainer.style.display = "none";
        textSpan.textContent = "Options: ";
        iconSpan.textContent = "👁";
    } else {
        buttonContainer.style.display = "grid";
        textSpan.textContent = "Options: ";
        iconSpan.textContent = "❌";
    }

    isHUDShowed = !isHUDShowed;
});

// Key Binding Button
let areBindingsShown = true;
document.getElementById("showControlOptions").addEventListener("click", () => {
    const panelContainer = document.getElementById("bindingPanel");
    const showControlOptions = document.getElementById("showControlOptions");
    const textSpan = showControlOptions.querySelector("span:first-child");
    const iconSpan = showControlOptions.querySelector("span:last-child");

    if (areBindingsShown) {
        panelContainer.style.display = "none";
        textSpan.textContent = "Key Bindings: ";
        iconSpan.textContent = "👁";
    } else {
        panelContainer.style.display = "flex";
        textSpan.textContent = "Key Bindings: ";
        iconSpan.textContent = "❌";
    }

    areBindingsShown = !areBindingsShown;
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
    cameraTargetPosition.set(0, 5, 0);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

document.getElementById("front-view-btn").addEventListener("click", () => {
    cameraTargetPosition.set(0, 4.5, 4.5);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

document.getElementById("back-view-btn").addEventListener("click", () => {
    cameraTargetPosition.set(0, 4.5, -4.5);
    controls.target.set(0, 2.5, 0);
    isCameraMoving = true;
});

// Resetting Balls Triangle
document.getElementById("ball-triangle-btn").addEventListener("click", () => {
    resetMatch();
});

// Helper Function to reset the entire match
function resetMatch() {
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

    playerType = null;
    opponentType = null;
    playerScore = 0;
    opponentScore = 0;
    currentPlayer = 1;

    ballsPocketedThisTurn = [];

    shotTaken = false;
    turnEvaluated = false;
}

// Disable / Enable VFX Effects
let vfxEnabled = true;

document.getElementById("vfx-disable-btn").addEventListener("click", () => {
    vfxEnabled = !vfxEnabled;

    // Shadows ON/OFF
    renderer.shadowMap.enabled = vfxEnabled;
    spotLight.castShadow = vfxEnabled;

    // Changing the intensity of the lights
    ambientLight.intensity = vfxEnabled ? 0.05 : 2.5;
    spotLight.intensity = vfxEnabled ? 50 : 35;

    // POCKET LIGHTS (CAUSE OF LAG)
    if (vfxEnabled) {
        createLedLights();
    } else {
        ledLights.forEach((led) => {
            scene.remove(led);
        });
        ledLights.length = 0;
    }

    console.log(`VFX Effects ${vfxEnabled ? "enabled" : "disabled"}`);

    const vfxButton = document.getElementById("vfx-disable-btn");

    vfxButton.className = vfxEnabled
        ? "cursor-pointer col-span-2 transition px-6 py-2 bg-green-500 rounded-lg text-white hover:bg-green-600"
        : "cursor-pointer col-span-2 transition px-6 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600";

    vfxButton.innerText = vfxEnabled ? "VFX Enabled" : "VFX Disabled";
});

// "Take a Shot" Dummy Test:
// Shoots the white ball to a random position by setting its velocity
document.getElementById("dummy-test-btn").addEventListener("click", () => {
    const randomSpeed = 7;
    const vx = (Math.random() * 2 - 1) * randomSpeed;
    const vz = (Math.random() * 2 - 1) * randomSpeed;
    whiteBall.velocity.set(vx, 0, vz);

    shotTaken = true;
    turnEvaluated = false;
});

let stickForce = 2.5;
let rotationSpeed = 0.025;
let shotTaken = false;
let turnEvaluated = false;

window.addEventListener("keydown", (event) => {
    // Rotating the Cue Stick clockwise
    if (event.key === "ArrowLeft") {
        stickAngle -= rotationSpeed;
    }
    // Rotating the Cue Stick counter-clockwise
    else if (event.key === "ArrowRight") {
        stickAngle += rotationSpeed;
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
                let force = direction.clone().multiplyScalar(stickForce); // StickForce is the force applied to the ball by the shot (simulating a mid-powerful shot)
                whiteBall.velocity = force;

                shotTaken = true;
                turnEvaluated = false;
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
        this.geometry = new THREE.SphereGeometry(radius, 16, 16);
        this.material = new THREE.MeshStandardMaterial({
            metalness: 0.5,
            roughness: 0.2,
            map: texture,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.position.copy(initialPosition);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);

        this.isPocketed = false;
        this.isBlackBall = false;
        this.isSolid = false;
        this.mass = 0.21; // 210g
        scene.add(this.mesh);
    }

    update(deltaTime) {
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        handleTableCollision(this);

        let spinScale = 1.2; // Incrementing this value will increase the spin of the ball

        this.angularVelocity
            .copy(
                new THREE.Vector3()
                    .crossVectors(this.velocity, new THREE.Vector3(0, 1, 0)) // Tangent Velocity (velocity * y-vector in order to grant x|z correct spin) / radius
                    .divideScalar(this.geometry.parameters.radius)
            )
            .multiplyScalar(spinScale); // Tanget Velocity divided with radius and multiplied by spinScale

        // We apply that to the mesh
        this.mesh.rotation.x += this.angularVelocity.x * deltaTime;
        this.mesh.rotation.y += this.angularVelocity.y * deltaTime;
        this.mesh.rotation.z += this.angularVelocity.z * deltaTime;

        // Simulates friction by reducing the velocity by 2% each frame
        const dampingFactorPerSecond = 0.8; // Can be redifined to change the friction level (the lower, the slower)
        const damping = Math.pow(dampingFactorPerSecond, deltaTime); // deltaTime refers to the substeps
        this.velocity.multiplyScalar(damping);
        this.angularVelocity.multiplyScalar(damping);
    }
}

//----------------------------------------------//
// Creating Balls + Texture and Triangle Positioning
//----------------------------------------------//
const ballRadius = 0.075;
let spacingOffset = 2.05;
const triangleStart = new THREE.Vector3(1.25, 2.55, 0);
const balls = [];

let whiteBall = new Ball(ballRadius, new THREE.Vector3(0, 2.55, -1.5));
balls.push(whiteBall);

function createTriangleBalls() {
    const spacing = ballRadius * spacingOffset;
    let index = 0;
    const rows = 5;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col <= row; col++) {
            const z = triangleStart.x + (row * spacing * Math.sqrt(3)) / 2;
            const x = triangleStart.z + (col - row / 2) * spacing;

            const pos = new THREE.Vector3(x, 2.55, z);
            const ball = new Ball(ballRadius, pos, ballTextures[index]);

            if (index === 7) {
                ball.isBlackBall = true;
            } else if (index < 8) {
                ball.isSolid = true;
            } else {
                ball.isSolid = false;
            }

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
const texturePromises = [];

for (let i = 1; i <= 15; i++) {
    texturePromises.push(
        new Promise((resolve) => {
            textureLoader.load(
                `/models/billiards/textures/balls/ball${i}.png`,
                (texture) => {
                    texture.encoding = THREE.sRGBEncoding;
                    texture.generateMipmaps = false;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    resolve(texture);
                }
            );
        })
    );
}
Promise.all(texturePromises).then((textures) => {
    ballTextures.push(...textures);
    createTriangleBalls();
});

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
        ball.velocity.x = -ball.velocity.x * 0.85; // Opposite Direction + Minor Velocity
    } else if (ball.mesh.position.x + r > tableMaxX) {
        ball.mesh.position.x = tableMaxX - r;
        ball.velocity.x = -ball.velocity.x * 0.85;
    }

    // Z-Axis Collision
    if (ball.mesh.position.z - r < tableMinZ) {
        ball.mesh.position.z = tableMinZ + r;
        ball.velocity.z = -ball.velocity.z * 0.85;
    } else if (ball.mesh.position.z + r > tableMaxZ) {
        ball.mesh.position.z = tableMaxZ - r;
        ball.velocity.z = -ball.velocity.z * 0.85;
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
    // First we want to compute the standard velocity:
    // Normal, Distances, momentum conservation and collysion dynamics
    const normal = new THREE.Vector3().subVectors(
        ball2.mesh.position,
        ball1.mesh.position
    );
    const distance = normal.length();
    const radiusSum =
        ball1.geometry.parameters.radius + ball2.geometry.parameters.radius;

    if (distance < 1e-6) {
        distance = 1e-6;
    } else {
        normal.divideScalar(distance);
    }

    const overlap = radiusSum - distance;

    // If the balls are overlapping
    if (overlap > 0) {
        // Final Velocity 1/2 = ((m1v1n) + (m2v2n) - e(m2|m1(v1n-v2n))) / (m1 + m2)

        ball1.mesh.position.addScaledVector(normal, -overlap / 2);
        ball2.mesh.position.addScaledVector(normal, overlap / 2);

        const v1n = normal.dot(ball1.velocity);
        const v2n = normal.dot(ball2.velocity);

        const e = 0.8; // Useful to simulate a partial momentum conservation
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

        // Spin applied to each ball
        // and the effect this is going to have on the final trajectory
        // cP = (c1 + c2) / 2
        const contactPoint = new THREE.Vector3()
            .addVectors(ball1.mesh.position, ball2.mesh.position)
            .multiplyScalar(0.5);

        // Vectors c1|2 - contactPoint -> Torque applied to each ball
        const r1 = new THREE.Vector3().subVectors(
            contactPoint,
            ball1.mesh.position
        );
        const r2 = new THREE.Vector3().subVectors(
            contactPoint,
            ball2.mesh.position
        );

        // Angular Impulse
        const impulseScalar = Math.abs(v1nChange) * m1;
        const spinTransferCoeff = 0.2;

        const angularImpulse1 = new THREE.Vector3()
            .crossVectors(r1, normal)
            .multiplyScalar(impulseScalar * spinTransferCoeff);
        const angularImpulse2 = new THREE.Vector3()
            .crossVectors(r2, normal)
            .multiplyScalar(impulseScalar * spinTransferCoeff);

        ball1.angularVelocity.add(angularImpulse1);
        ball2.angularVelocity.sub(angularImpulse2);

        // Spin effect on the trajectory
        const spinInfluenceCoeff = 0.05;

        // Reproducing the "screw" effect from the 8-Ball Pool Table (friction)
        const spinEffect1 = new THREE.Vector3()
            .crossVectors(ball1.angularVelocity, normal)
            .multiplyScalar(spinInfluenceCoeff);
        const spinEffect2 = new THREE.Vector3()
            .crossVectors(ball2.angularVelocity, normal)
            .multiplyScalar(spinInfluenceCoeff);

        // Nullify the Y-Component
        spinEffect1.y = 0;
        spinEffect2.y = 0;

        ball1.velocity.add(spinEffect1);
        ball2.velocity.sub(spinEffect2);

        ball1.velocity.y = 0;
        ball2.velocity.y = 0;
    }
}

let subSteps = 4;
function updatePhysics(deltaTime) {
    const dt = deltaTime / subSteps;

    for (let i = 0; i < subSteps; i++) {
        balls.forEach((ball) => ball.update(dt));

        // Ball-Ball collisions
        for (let j = 0; j < balls.length; j++) {
            for (let k = j + 1; k < balls.length; k++) {
                if (areBallsColliding(balls[j], balls[k])) {
                    resolveCollision(balls[j], balls[k]);
                }
            }
        }
    }
}

//-----------------------------------//
// Creating Pocket HitBoxes for score
//-----------------------------------//
const pocketRadius = 0.22;

const pockets = [];
const pocketPositions = [
    new THREE.Vector3(tableMinX + 0.05, 2.45, tableMinZ + 0.05), // TOP RIGHT
    new THREE.Vector3(tableMinX + 0.05, 2.45, tableMaxZ - 0.05), // TOP LEFT
    new THREE.Vector3(tableMaxX - 0.05, 2.45, tableMinZ + 0.05), // BOTTOM RIGHT
    new THREE.Vector3(tableMaxX - 0.05, 2.45, tableMaxZ - 0.05), // BOTTOM LEFT
    new THREE.Vector3(tableMinX - 0.15, 2.45, 0), // CENTER TOP
    new THREE.Vector3(tableMaxX + 0.15, 2.45, 0), // CENTER BOTTOM
];

pocketPositions.forEach((pos) => {
    const geometry = new THREE.SphereGeometry(pocketRadius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: "white",
        wireframe: true,
        visible: false, // Set to true for debugging
    });
    const pocket = new THREE.Mesh(geometry, material);

    pocket.position.copy(pos);
    pockets.push(pocket);
    scene.add(pocket);
});

// Helper functions to check if a ball is in a pocket (true/false)
function checkBallInPocket(ball) {
    for (let pocket of pockets) {
        const dist = ball.mesh.position.distanceTo(pocket.position);
        if (dist < ball.geometry.parameters.radius + pocketRadius) {
            return true;
        }
    }
    return false;
}

// Main core function to handle ball pocketed
// Implementing foul, player type and score
let currentPlayerScore = 0;
let ballsPocketedThisTurn = [];
function handleBallPocketed(ball) {
    if (ball.isPocketed) return;

    // Case 1: White Ball Pocketed
    if (
        ball === whiteBall &&
        (!playerType || ballsPocketedThisTurn.length === 0)
    ) {
        Toastify({
            text:
                `❌ Faul: \nPlayer ${currentPlayer} pocketed the white ball! \nPlayer ` +
                (currentPlayer === 1 ? 2 : 1) +
                " now plays",
            duration: 3000,
            gravity: "bottom",
            position: "left",
            style: {
                background: "linear-gradient(to right, red, #121212)",
                borderRadius: "8px",
                fontWeight: "bold",
            },
        }).showToast();

        whiteBall.mesh.position.set(0, 2.55, -1.5);
        whiteBall.velocity.set(0, 0, 0);

        return;
    } else if (ball === whiteBall && playerType) {
        Toastify({
            text:
                `❌ Faul: \nPlayer ${currentPlayer} pocketed the white ball! \nPlayer ` +
                (currentPlayer === 1 ? 2 : 1) +
                " now plays",
            duration: 3000,
            gravity: "bottom",
            position: "left",
            style: {
                background: "linear-gradient(to right, red, #121212)",
                borderRadius: "8px",
                fontWeight: "bold",
            },
        }).showToast();

        whiteBall.mesh.position.set(0, 2.55, -1.5);
        whiteBall.velocity.set(0, 0, 0);

        ballsPocketedThisTurn.push({ type: "whiteBall", foul: true });
        return;
    }

    const currentPlayerScore =
        currentPlayer === 1 ? playerScore : opponentScore;

    // 8-Black Ball Pocketed Handling
    if (ball.isBlackBall && currentPlayerScore < 7) {
        alert(
            "Player " +
                currentPlayer +
                " loses due pocketing 8-Black Ball \nPlayer " +
                (currentPlayer === 1 ? 2 : 1) +
                " wins!"
        );
        resetMatch();
        return;
    } else if (ball.isBlackBall && currentPlayerScore === 7) {
        alert(
            "Player " + currentPlayer + " pocketed the 8-Black Ball and wins!"
        );
        resetMatch();
        return;
    }

    ball.isPocketed = true;
    const forwardOffset = ball.velocity.clone().normalize().multiplyScalar(0.5); // We save the velocity in order to use it for pocket effect
    ball.velocity.set(0, 0, 0);
    ball.angularVelocity.set(0, 0, 0);

    ballsPocketedThisTurn.push({
        ball: ball,
        type: ball.isSolid ? "Solid" : "Stripe",
        isBlackBall: ball.isBlackBall,
        foul: false,
    });

    // Case 2: First Shot Ball Pocketed
    if (playerType === null && typeof ball.isSolid === "boolean") {
        if (currentPlayer === 1) {
            playerType = ball.isSolid ? "Solid" : "Stripe";
            opponentType = ball.isSolid ? "Stripe" : "Solid";
        } else {
            playerType = ball.isSolid ? "Stripe" : "Solid";
            opponentType = ball.isSolid ? "Solid" : "Stripe";
        }

        Toastify({
            text: `🎱 Teams have been decided! 🎱\nPlayer 1: ${playerType.toUpperCase()} \nPlayer 2: ${opponentType.toUpperCase()}`,
            duration: 3000,
            gravity: "bottom",
            position: "right",
            style: {
                background: "linear-gradient(to right, #764ba2, #121212)",
                borderRadius: "8px",
                fontWeight: "bold",
            },
        }).showToast();

        console.log("🧩 Giocatore 1:", playerType.toUpperCase());
        console.log("🧩 Giocatore 2:", opponentType.toUpperCase());

        updatePlayerTypeUI?.();
    }

    // Update pocketed ball position (let it fall into the canister)
    ball.targetPosition = new THREE.Vector3(
        ball.mesh.position.x + forwardOffset.x,
        2.1,
        ball.mesh.position.z + forwardOffset.z
    );

    ball.update = function (deltaTime) {
        this.mesh.position.lerp(this.targetPosition, 0.0075);
    };
}

// Helper Function to notify about score
function updateScore() {
    Toastify({
        text: `📊 Score Update: \nPlayer 1 (${
            playerType || "TBD"
        }): ${playerScore} \nPlayer 2 (${
            opponentType || "TBD"
        }): ${opponentScore}`,
        duration: 3000,
        gravity: "bottom",
        position: "right",
        style: {
            background: "linear-gradient(to right, #667eea, #121212)",
            borderRadius: "8px",
            fontWeight: "bold",
        },
    }).showToast();
}

function evaluateTurnEnd() {
    let shouldKeepTurn = false;
    let hasFoul = false;
    let myPoints = 0;
    let opponentPoints = 0;
    let isFirstTurn = playerType === null;

    // No balls pocketed -> Turn Ends
    if (ballsPocketedThisTurn.length === 0) {
        shouldKeepTurn = false;
        Toastify({
            text: `No balls pocketed. Turn ends.`,
            duration: 2000,
            gravity: "bottom",
            position: "left",
            style: {
                background: "linear-gradient(to right, #666, #121212)",
                borderRadius: "8px",
            },
        }).showToast();
    } else {
        // Checks for White Ball Foul
        const hasWhiteBallFoul = ballsPocketedThisTurn.some(
            (ball) => ball.type === "whiteBall"
        );

        if (hasWhiteBallFoul) {
            hasFoul = true;
            shouldKeepTurn = false;
        } else {
            // Filters non-white balls
            const coloredBalls = ballsPocketedThisTurn.filter(
                (ball) => ball.type !== "whiteBall"
            );

            if (coloredBalls.length > 0) {
                // FIRST TURN: Define Player Type
                if (isFirstTurn) {
                    const firstBall = coloredBalls[0];

                    if (currentPlayer === 1) {
                        playerType = firstBall.type;
                        opponentType =
                            firstBall.type === "Solid" ? "Stripe" : "Solid";
                    } else {
                        playerType =
                            firstBall.type === "Solid" ? "Stripe" : "Solid";
                        opponentType = firstBall.type;
                    }

                    Toastify({
                        text: `🎱 Teams decided! Player 1: ${playerType.toUpperCase()} | Player 2: ${opponentType.toUpperCase()}`,
                        duration: 3000,
                        gravity: "bottom",
                        position: "right",
                        style: {
                            background:
                                "linear-gradient(to right, #764ba2, #121212)",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        },
                    }).showToast();

                    updatePlayerTypeUI?.();
                }

                const currentPlayerType =
                    currentPlayer === 1 ? playerType : opponentType;

                let myBalls = 0;
                let wrongBalls = 0;

                coloredBalls.forEach((ball) => {
                    if (ball.type === currentPlayerType) {
                        myBalls++;
                        myPoints++;
                    } else {
                        wrongBalls++;
                        opponentPoints++;
                    }
                });

                if (currentPlayer === 1) {
                    playerScore += myPoints;
                    opponentScore += opponentPoints;
                } else {
                    opponentScore += myPoints;
                    playerScore += opponentPoints;
                }

                // FAUL for wrong pocketed balls
                if (!isFirstTurn && wrongBalls > 0) {
                    hasFoul = true;
                    shouldKeepTurn = false;

                    let message = `❌ FOUL! Player ${currentPlayer} pocketed wrong ball(s)`;
                    if (myPoints > 0) {
                        message += `\n+${myPoints} points to you, +${opponentPoints} points to opponent`;
                    } else {
                        message += `\n+${opponentPoints} points to opponent`;
                    }

                    Toastify({
                        text: message,
                        duration: 3000,
                        gravity: "bottom",
                        position: "left",
                        style: {
                            background:
                                "linear-gradient(to right, #ff416c, #121212)",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        },
                    }).showToast();
                } else {
                    shouldKeepTurn = true;

                    let message = `✅ Player ${currentPlayer} continues! (+${myPoints} points)`;
                    if (opponentPoints > 0) {
                        message += `\n+${opponentPoints} points to opponent!`;
                    }

                    Toastify({
                        text: message,
                        duration: 3000,
                        gravity: "bottom",
                        position: "right",
                        style: {
                            background:
                                "linear-gradient(to right, #00b09b, #121212)",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        },
                    }).showToast();
                }
            }
        }
    }

    // Turn Switches if necessary
    if (!shouldKeepTurn) {
        currentPlayer = currentPlayer === 1 ? 2 : 1;

        let turnMessage = `🔄 Player ${currentPlayer}'s turn`;
        if (hasFoul) {
            turnMessage = `🔄 Player ${currentPlayer}'s turn (after foul)`;
        }

        Toastify({
            text: turnMessage,
            duration: 2000,
            gravity: "top",
            position: "center",
            style: {
                background: "linear-gradient(to right, #1d6eb4, #121212)",
                borderRadius: "8px",
                fontWeight: "bold",
            },
        }).showToast();
    }

    updateScore();
    ballsPocketedThisTurn = [];
}

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
    direction.y = 0; // We ignore Y-Axis, we want to rotate around it
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
    // Setting up durations params
    const duration = 150;
    const retreatDelay = 75;
    const retreatDuration = 150;

    // Initial/Final pos of the stick
    const start = -1.75;
    const end = -1.5;

    const startTime = performance.now();

    function animateForward(now) {
        // Compute the progress of the animation with elapsed time
        // Updating the stick pos
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        stickRadius = start + (end - start) * t;

        if (t < 1) {
            requestAnimationFrame(animateForward); // Animation not ended yet
        } else {
            // Once the animation is done, we start the retreat
            // In order to let the stick go back to its initial pos
            if (callback) callback();
            stickRadius = start;
        }
    }

    requestAnimationFrame(animateForward);
}

//----------------------------------------//
// Adding Trajectory Line Stick-WhiteBall
//----------------------------------------//

let aimLine, aimWhiteLine, aimTargetLine;

// TableBox (useful for bouncing trajectory lines on the table edges)
const tableBox = new THREE.Box3(
    new THREE.Vector3(tableMinX, 0, tableMinZ),
    new THREE.Vector3(tableMaxX, 2.75, tableMaxZ) // Height doesn't matter
);

function updateAimLine() {
    if (!stick || !whiteBall) return;

    // Get rid of old aimLines
    [aimLine, aimWhiteLine, aimTargetLine].forEach((line) => {
        if (line) scene.remove(line);
    });

    // Aim Direction
    const start = whiteBall.mesh.position
        .clone()
        .add(new THREE.Vector3(0, 0.035, 0));
    const direction = new THREE.Vector3()
        .subVectors(start, stick.position)
        .normalize();
    const points = [start];

    // Closest ball that will be hit (ball-ball collision)
    let closestHit = null;
    let minDistance = Infinity;

    // Simulates collisions between balls, checks if the stick and a ball
    // will be so close to hit each other, if so we save it

    // targetCenter = center of the target ball
    // collisionRadius = sum of the radius (ball - ball)
    // toTarget = White Ball Vector
    // projectionLength = Projection of the shot
    // closestDistSq = Squared distance between the stick and the target ball
    // collisionDist = Distance start-contact
    balls.forEach((ball) => {
        if (ball === whiteBall) return;

        const targetCenter = ball.mesh.position.clone();
        const collisionRadiusSum =
            ball.geometry.parameters.radius +
            whiteBall.geometry.parameters.radius;

        const toTargetVec = new THREE.Vector3().subVectors(targetCenter, start);
        const projectionLength = toTargetVec.dot(direction);

        // Behind the stick case
        if (projectionLength < 0) return;

        const closestDistSq =
            toTargetVec.lengthSq() - projectionLength * projectionLength;

        // Too far -> nothing happens
        if (closestDistSq > collisionRadiusSum * collisionRadiusSum) return;

        const halfChord = Math.sqrt(
            collisionRadiusSum * collisionRadiusSum - closestDistSq
        );
        const collisionDist = projectionLength - halfChord;
        if (collisionDist < 0) return;

        const contactPoint = start
            .clone()
            .add(direction.clone().multiplyScalar(collisionDist));

        if (collisionDist < minDistance) {
            minDistance = collisionDist;
            closestHit = { ball, point: contactPoint };
        }
    });

    // Simplified Physics applied to the handleBallCollision case
    if (closestHit) {
        const targetBall = closestHit.ball;
        const collisionPoint = closestHit.point;
        points.push(collisionPoint);

        const m1 = whiteBall.mass;
        const m2 = targetBall.mass;
        const e = 0.8;

        const initialVelocity = direction.clone();
        const normal = new THREE.Vector3()
            .subVectors(targetBall.mesh.position, collisionPoint)
            .normalize();

        const v1n = normal.dot(initialVelocity);
        const v2n = 0; // The 2nd ball is still

        const v1nFinal =
            (m1 * v1n + m2 * v2n - e * m2 * (v1n - v2n)) / (m1 + m2);
        const v2nFinal =
            (m1 * v1n + m2 * v2n + e * m1 * (v1n - v2n)) / (m1 + m2);

        const v1nChange = v1nFinal - v1n;
        const v2nChange = v2nFinal - v2n;

        const whiteFinalVel = initialVelocity
            .clone()
            .addScaledVector(normal, v1nChange);
        const targetFinalVel = normal.clone().multiplyScalar(v2nFinal);

        whiteFinalVel.y = 0;
        targetFinalVel.y = 0;

        const scale = 0.5;

        const whiteEnd = collisionPoint
            .clone()
            .add(whiteFinalVel.clone().multiplyScalar(scale));
        const targetEnd = collisionPoint
            .clone()
            .add(targetFinalVel.clone().multiplyScalar(scale));

        // WhiteBall post-collision line (GREEN)
        aimWhiteLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                collisionPoint,
                whiteEnd,
            ]),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
        );
        scene.add(aimWhiteLine);

        // Target Ball post-collision line (BLUE)
        aimTargetLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                collisionPoint,
                targetEnd,
            ]),
            new THREE.LineBasicMaterial({ color: 0x0000ff })
        );
        scene.add(aimTargetLine);
    } else {
        // No ball -> Handle Table Collision Line
        const ray = new THREE.Ray(start.clone(), direction.clone());
        const boundaryHit = new THREE.Vector3();

        // We compute bouncing point and reflected direction
        if (ray.intersectBox(tableBox, boundaryHit)) {
            boundaryHit.y = 2.6;
            points.push(boundaryHit);

            const bounceDirection = direction.clone();
            if (boundaryHit.x <= tableMinX || boundaryHit.x >= tableMaxX)
                bounceDirection.x *= -1;
            if (boundaryHit.z <= tableMinZ || boundaryHit.z >= tableMaxZ)
                bounceDirection.z *= -1;

            const reflectedEnd = boundaryHit
                .clone()
                .add(bounceDirection.multiplyScalar(0.5));
            reflectedEnd.y = 2.6;
            points.push(reflectedEnd);
        }
        // Straight Line
        else {
            const fallbackEnd = start
                .clone()
                .add(direction.clone().multiplyScalar(3));
            fallbackEnd.y += 0.035;
            points.push(fallbackEnd);
        }
    }

    // AimLine (RED)
    aimLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    scene.add(aimLine);
}

//--------------------------------------------//
// Axis & Box Debugger (uncomment to use them)
//--------------------------------------------//

/*
const boxHelper = new THREE.Box3Helper(tableBox, 0xffff00);
scene.add(boxHelper);

const axesHelper = new THREE.AxesHelper();
axesHelper.position.y = 2.65;
scene.add(axesHelper);

*/

//--------------------------------------------------------------------------------//
// Updating UI Interface at the start
//--------------------------------------------------------------------------------//

let playerType = null;
let opponentType = null;
let currentPlayer = 1;
let playerScore = 0;
let opponentScore = 0;

// Shows the current player type on the UI
function updatePlayerTypeUI() {
    const el = document.getElementById("player-type");

    if (playerType) {
        if (currentPlayer === 1) {
            el.innerText = `🎱 Player ${currentPlayer} (${playerType.toUpperCase()}): ${playerScore} points`;
        } else if (currentPlayer === 2) {
            el.innerText = `🎱 Player ${currentPlayer} (${opponentType.toUpperCase()}): ${opponentScore} points`;
        }
    } else {
        el.innerText = `🎱 Player ${currentPlayer}: Waiting for the first valid pocketed ball`;
    }
}

//----------------------//
// Enhancing VFX
//----------------------//

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
    new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5, // strength (how it "shines")
        0.1, // radius (the smaller, the more contained is the glow)
        0.85 // threshold
    )
);

// POSSIBLE TESTED CAUSE OF LAG!
// Define Led Lights in the pocket position (sligthly under the pocket)
const ledLights = [];
const ledLightsPosition = [
    new THREE.Vector3(tableMinX + 0.05, 2.5, tableMinZ + 0.05), // TOP RIGHT
    new THREE.Vector3(tableMinX + 0.05, 2.5, tableMaxZ - 0.05), // TOP LEFT
    new THREE.Vector3(tableMaxX - 0.05, 2.5, tableMinZ + 0.05), // BOTTOM RIGHT
    new THREE.Vector3(tableMaxX - 0.05, 2.5, tableMaxZ - 0.05), // BOTTOM LEFT
    new THREE.Vector3(tableMinX - 0.15, 2.5, 0), // CENTER TOP
    new THREE.Vector3(tableMaxX + 0.15, 2.5, 0), // CENTER BOTTOM
];

function createLedLights() {
    ledLightsPosition.forEach((pos) => {
        const ledLight = new THREE.PointLight(0x00ffcc, 1, 1.5);
        ledLight.castShadow = false;
        ledLight.position.copy(pos);
        ledLights.push(ledLight);
        scene.add(ledLight);
    });
}

createLedLights();

//-------------------------------//
// Tweakpane params customization
//-------------------------------//
const params = {
    stickForce: 2.5,
    rotationSpeed: 0.025,
    spacingOffset: 2.05,
    subSteps: 4,
};

const pane = new Pane();
pane.element.style.scale = "1.075";

const stickForceInput = pane.addBinding(params, "stickForce", {
    min: 0.1,
    max: 5,
    step: 0.1,
    label: "Shot Power",
});

const rotationSpeedInput = pane.addBinding(params, "rotationSpeed", {
    min: 0.001,
    max: 0.05,
    step: 0.001,
    label: "Rotation Speed",
});

const subStepsInput = pane.addBinding(params, "subSteps", {
    min: 2,
    max: 12,
    step: 2,
    label: "Physics Steps",
});

const spacingOffsetInput = pane.addBinding(params, "spacingOffset", {
    min: 2.0,
    max: 5,
    steps: 0.05,
    label: "Spacing Offset",
});

// Applying changes
stickForceInput.on("change", (ev) => {
    stickForce = ev.value;
});

rotationSpeedInput.on("change", (ev) => {
    rotationSpeed = ev.value;
});

subStepsInput.on("change", (ev) => {
    subSteps = ev.value;
});

spacingOffsetInput.on("change", (ev) => {
    spacingOffset = ev.value;

    resetMatch();
});

//-----------------//
// Initialize Clock
//-----------------//
const clock = new THREE.Clock();

// ----------------------------------//
// Animation Loop + Helper Functions
// ----------------------------------//

function animate() {
    const deltaTime = clock.getDelta();

    updatePhysics(deltaTime);
    balls.forEach((ball) => ball.update(deltaTime));

    // Checking only not pocketed balls
    balls.forEach((ball) => {
        if (!ball.isPocketed && checkBallInPocket(ball)) {
            handleBallPocketed(ball);
        }
    });

    if (isCameraMoving) {
        camera.position.lerp(cameraTargetPosition, 0.05);
        if (camera.position.distanceTo(cameraTargetPosition) < 0.01) {
            isCameraMoving = false;
        }
    }

    const allBallsStopped = balls.every(
        (ball) => ball.velocity.distanceTo(new THREE.Vector3(0, 0, 0)) < 0.01
    );

    if (allBallsStopped) {
        balls.forEach((ball) => ball.velocity.set(0, 0, 0));

        if (shotTaken && !turnEvaluated) {
            evaluateTurnEnd();
            shotTaken = false;
            turnEvaluated = true;
        }

        if (!shotTaken) {
            adjustStickPosition();
            updateAimLine();
        }
    }

    updatePlayerTypeUI();
    controls.update();

    if (vfxEnabled) {
        // VFX Enabled -> Enhanced Rendering
        composer.render();
    } else {
        // VFX Disabled -> Classic Rendering
        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
}

animate();
