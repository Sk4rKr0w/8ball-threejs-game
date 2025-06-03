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
    console.log("Modello del tavolo caricato!");
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
    cameraTargetPosition.set(0, 5, 0);
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
                let force = direction.clone().multiplyScalar(3.5); // 3.5 is the force applied to the ball by the shot (simulating a mid-powerful shot)
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
        this.isSolid = false;
        scene.add(this.mesh);
    }

    update(deltaTime) {
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        handleTableCollision(this);

        let spinScale = 1.2; // Incrementing this value will increase the spin of the ball

        this.angularVelocity
            .copy(
                new THREE.Vector3()
                    .crossVectors(this.velocity, new THREE.Vector3(0, 1, 0))
                    .divideScalar(this.geometry.parameters.radius)
            )
            .multiplyScalar(spinScale);

        this.mesh.rotation.x += this.angularVelocity.x * deltaTime;
        this.mesh.rotation.y += this.angularVelocity.y * deltaTime;
        this.mesh.rotation.z += this.angularVelocity.z * deltaTime;

        // Simulates friction by reducing the velocity by 1.75% each frame
        const dampingFactorPerSecond = 0.8; // questo va ridefinito meglio
        const damping = Math.pow(dampingFactorPerSecond, deltaTime); // dove deltaTime è del substep
        this.velocity.multiplyScalar(damping);
        this.angularVelocity.multiplyScalar(damping);
    }
}

//----------------------------------------------//
// Creating Balls + Texture and Triangle Positioning
//----------------------------------------------//
const ballRadius = 0.075;
const spacing = ballRadius * 2.05;
const triangleStart = new THREE.Vector3(1.25, 2.55, 0);
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
            if (index <= 8) {
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

    if (distance < 1e-6) {
        distance = 1e-6;
    } else {
        normal.divideScalar(distance);
    }

    const overlap = radiusSum - distance;
    if (overlap > 0) {
        // Sposta le palle per eliminare la sovrapposizione
        ball1.mesh.position.addScaledVector(normal, -overlap / 2);
        ball2.mesh.position.addScaledVector(normal, overlap / 2);

        // Proiezioni delle velocità lungo la normale
        const v1n = normal.dot(ball1.velocity);
        const v2n = normal.dot(ball2.velocity);

        const e = 0.8; // coefficiente di restituzione
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

        // === Effetto rotazionale (spin) ===
        const contactPoint = new THREE.Vector3()
            .addVectors(ball1.mesh.position, ball2.mesh.position)
            .multiplyScalar(0.5);

        const r1 = new THREE.Vector3().subVectors(
            contactPoint,
            ball1.mesh.position
        );
        const r2 = new THREE.Vector3().subVectors(
            contactPoint,
            ball2.mesh.position
        );

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

        // === Effetto dello spin sulla direzione (deviazione) ===
        const spinInfluenceCoeff = 0.05;

        const spinEffect1 = new THREE.Vector3()
            .crossVectors(ball1.angularVelocity, normal)
            .multiplyScalar(spinInfluenceCoeff);
        const spinEffect2 = new THREE.Vector3()
            .crossVectors(ball2.angularVelocity, normal)
            .multiplyScalar(spinInfluenceCoeff);

        // Applichiamo solo X e Z, ignorando Y
        spinEffect1.y = 0;
        spinEffect2.y = 0;

        ball1.velocity.add(spinEffect1);
        ball2.velocity.sub(spinEffect2); // Opposto per coerenza

        // Pulizia: forza le velocità fuori dall’asse del tavolo a 0
        ball1.velocity.y = 0;
        ball2.velocity.y = 0;
    }
}

function updatePhysics(deltaTime) {
    const substeps = 8;
    const dt = deltaTime / substeps;

    for (let i = 0; i < substeps; i++) {
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
const pocketRadius = 0.18;

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

let aimLine, aimWhiteLine, aimTargetLine;

// Definisci i limiti del tavolo come Box3
const tableBox = new THREE.Box3(
    new THREE.Vector3(tableMinX, 0, tableMinZ),
    new THREE.Vector3(tableMaxX, 2.75, tableMaxZ) // Height doesn't matter
);

function updateAimLine() {
    if (!stick || !whiteBall) return;

    // Rimuove le vecchie linee
    [aimLine, aimWhiteLine, aimTargetLine].forEach((line) => {
        if (line) scene.remove(line);
    });

    const start = whiteBall.mesh.position
        .clone()
        .add(new THREE.Vector3(0, 0.035, 0));
    const direction = new THREE.Vector3()
        .subVectors(start, stick.position)
        .normalize();
    const points = [start];

    // Trova la palla più vicina che verrà colpita (sfera-sfera)
    let closestHit = null;
    let minDistance = Infinity;

    // Instead of using the raycaster, we are going to use the sphere-sphere collision detection
    // This is because the raycaster is not accurate enough for this case
    // We are going to iterate over all balls (except the white one) and check if they are within the stick's range
    // We are looking for (c = center of the ball, r = sum of the radius whiteBall-target, l = vector start-sphere
    // t_ca = distance over the radius over the orthogonal projection of the center of the sphere)
    // d2 = minimum distance squared between center and radius
    // if d2 > r^2 then the sphere is out of range (no collision)
    // else, we compute t and the distance from the starting point on the surface
    // if t < minDistance, it is saved as the closest hit

    // This method is better due the fact that the raycaster is just a thin line, unable
    // to detect collision with a sphere, while the sphere-sphere collision detection is
    // able to detect collision with a sphere, even if it is not on the line of sight

    balls.forEach((ball) => {
        if (ball === whiteBall) return;

        const c = ball.mesh.position.clone(); // centro palla bersaglio
        const r =
            ball.geometry.parameters.radius +
            whiteBall.geometry.parameters.radius;

        const l = new THREE.Vector3().subVectors(c, start);
        const t_ca = l.dot(direction);
        if (t_ca < 0) return;

        const d2 = l.lengthSq() - t_ca * t_ca;
        if (d2 > r * r) return;

        const t_hc = Math.sqrt(r * r - d2);
        const t = t_ca - t_hc;
        if (t < 0) return;

        const contactPoint = start
            .clone()
            .add(direction.clone().multiplyScalar(t));
        if (t < minDistance) {
            minDistance = t;
            closestHit = { ball, point: contactPoint };
        }
    });

    if (closestHit) {
        const targetBall = closestHit.ball;
        const collisionPoint = closestHit.point;
        points.push(collisionPoint);

        // === Fisica semplificata ===
        const m1 = whiteBall.mass;
        const m2 = targetBall.mass;
        const e = 0.8;

        const initialVelocity = direction.clone();
        const normal = new THREE.Vector3()
            .subVectors(targetBall.mesh.position, collisionPoint)
            .normalize();

        const v1n = normal.dot(initialVelocity);
        const v2n = 0;

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

        // Linea bianca (verde)
        aimWhiteLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                collisionPoint,
                whiteEnd,
            ]),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
        );
        scene.add(aimWhiteLine);

        // Linea bersaglio (blu)
        aimTargetLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                collisionPoint,
                targetEnd,
            ]),
            new THREE.LineBasicMaterial({ color: 0x0000ff })
        );
        scene.add(aimTargetLine);
    } else {
        // Nessuna palla colpita → calcolo bordo tavolo
        const ray = new THREE.Ray(start.clone(), direction.clone());
        const boundaryHit = new THREE.Vector3();

        if (ray.intersectBox(tableBox, boundaryHit)) {
            boundaryHit.y += 0.035;
            points.push(boundaryHit);

            const bounceDirection = direction.clone();
            if (boundaryHit.x <= tableMinX || boundaryHit.x >= tableMaxX)
                bounceDirection.x *= -1;
            if (boundaryHit.z <= tableMinZ || boundaryHit.z >= tableMaxZ)
                bounceDirection.z *= -1;

            const reflectedEnd = boundaryHit
                .clone()
                .add(bounceDirection.multiplyScalar(0.5));
            reflectedEnd.y += 0.035;
            points.push(reflectedEnd);
        } else {
            const fallbackEnd = start
                .clone()
                .add(direction.clone().multiplyScalar(3));
            fallbackEnd.y += 0.035;
            points.push(fallbackEnd);
        }
    }

    // Linea principale (rossa)
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

//-----------------------//
// Initialize Clock
//-----------------------//
const clock = new THREE.Clock();

// ----------------------------------//
// Animation Loop + Helper Functions //
// ----------------------------------//

function animate() {
    const deltaTime = clock.getDelta();

    updatePhysics(deltaTime);
    balls.forEach((ball) => ball.update(deltaTime));

    balls.forEach((ball) => {
        if (checkBallInPocket(ball) && ball !== whiteBall) {
            removeBall(ball);
            score++;
            console.log("Palla in Buca!! Il tuo punteggio: " + score);
            console.log("La palla era Solid? " + ball.isSolid);
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
        // Azzeriamo tutte le velocità
        balls.forEach((ball) => ball.velocity.set(0, 0, 0));

        // Ora possiamo aggiornare stecca e linea mira
        adjustStickPosition();
        updateAimLine();
    }

    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
