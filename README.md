![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

# 🎱 8ball-threejs-game

A browser-based simulation of the classic 8-ball pool game, featuring realistic physics, interactive cue controls, dynamic lighting, friction simulation, and ball-to-ball and ball-to-wall collisions.  
Developed using **Three.js**, this project explores 3D rendering, shading, and real-time physics implementation in a web environment.

---

## 📚 Project Info

This project was developed as the **final assignment** for the **Interactive Graphics** course in the *Engineering in Computer Science* MSc program at **Sapienza University of Rome**.

---

## 🚀 Core Features

- ✅ Realistic ball physics (momentum, friction, angular velocity)
- ✅ Collision detection and resolution (ball–ball, ball–table)
- ✅ Interactive cue stick with animated shooting motion
- ✅ Predictive trajectory lines with bounce/collision logic
- ✅ Dynamic camera views (top, front, back, reset)
- ✅ HUD for controlling camera, settings, and key bindings
- ✅ VFX toggle: bloom effect, shadows, ambient lighting
- ✅ Scoring system, fouls, and 8-ball win/lose logic
- ✅ Texture-mapped balls with GLTF loading
- ✅ Customizable parameters via Tweakpane UI

---

## 🧪 Controls

### ⌨️ Keyboard
- `←` / `→`: Rotate the cue stick
- `Enter`: Shoot the cue stick

### 🖱️ UI Buttons
- **Camera Views**: Top, Front, Back, Reset
- **Reset Triangle**: Reset all balls
- **Toggle HUD**: Show/hide options
- **VFX Toggle**: Enable/disable lighting effects
- **Dummy Shot**: Shoot randomly for testing

---

## Must Know Params

- **Shot Power**  
  **Description:**  
  This parameter controls the force with which the cue hits the white ball. A higher value increases the initial speed of the ball, making the shot more powerful and the balls move faster on the table.

  **Impact on gameplay:**  
  A value that is too high might cause balls to fly off the table or make the game feel unrealistic (especially if combined with low physics steps)

- **Rotation Speed**  
  **Description:**  
  This represents the speed at which the cue rotates around the white ball. It affects the accuracy of the shot the user experience.

  **Impact on gameplay:**  
  A high value results in fast and dynamic rotation but less accuracy. A low value results in slower, more precise rotation.

- **Physics Steps**  
  **Description:**  
  This indicates the number of physics simulation sub-steps performed per frame. The higher the value, the more accurate and stable the physics simulation (collisions, movements) will be, but at the cost of performance.

  **Impact on gameplay:**  
  Low values can cause irregular behavior or imprecise collisions, while high values improve smoothness and accuracy but may slow down the game.

- **Spacing Offset**  
  **Description:**  
  This represents the minimum separation distance between balls when they are positioned on the table to avoid overlapping. This offset ensures that the balls always start slightly spaced apart.

  **Impact on gameplay:**  
  A value that is too small may cause balls to overlap, resulting in visual glitches or physics simulation issues. A value that is too large can affect the initial setup and aesthetics of the game. It was thought for custom games

---
## 📁 File Structure

```bash
📁 /models/
├── 📁 billiards/
│   ├── 🎮 scene.gltf
│   └── 📁 textures/balls/
│       ├── ball1.png ... ball15.png
├── 📁 billiard_cue/
│   └── 🎮 scene.gltf

📄 index.html
📄 main.js
📄 style.css
📄 README.md
📄 LICENSE
```

---

## 🔧 Dependencies

- [Three.js](https://threejs.org/)
- [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [UnrealBloomPass](https://threejs.org/docs/#examples/en/postprocessing/UnrealBloomPass)
- [Tweakpane](https://cocopon.github.io/tweakpane/)
- [ToastifyJS](https://apvarun.github.io/toastify-js/)

---

## 📖 License

This project is licensed under the **MIT License**.  
See the [LICENSE](./LICENSE) file for full details.

> Proper attribution is appreciated if you use or adapt this work.

---

## 🙏 Attribution

If you use or modify this project, please credit the original author:

**Developed by [Kevin Forte]**  
GitHub: [@Sk4rKr0w](https://github.com/Sk4rKr0w)


