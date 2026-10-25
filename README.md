# ✨ SHADOW SHOP — A Magical Indie Puzzle Adventure

[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-blueviolet?style=flat-square&logo=github)](https://pages.github.com/)
[![Pure Vanilla](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-brightgreen?style=flat-square)](https://developer.mozilla.org/en-US/)
[![Web Audio API](https://img.shields.io/badge/Audio-Synthesized%20Web%20Audio-ff69b4?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-orange?style=flat-square)](#)

> **SHADOW SHOP** is a charming, beginner-friendly 2D puzzle game where you guide cute apprentice **Lumi** and independently drag their living magical shadow, **Umbra**, through walls and across mystical chambers to collect shadow stars, activate ancient runes, and unlock the exit doors!

---

## 🎮 Gameplay & Mechanics

In **SHADOW SHOP**, physical reality and shadow energy exist in magical harmony:
1. **Lumi (The Apprentice)**: Lumi is a physical creature. Lumi can walk in 4 directions using Arrow Keys or WASD (or the on-screen D-Pad on mobile). Lumi is physically stopped by solid stone walls and locked gates.
2. **Umbra (The Independent Shadow)**: Umbra is Lumi's living purple shadow. You can grab and drag Umbra independently using your mouse pointer or touch screen.
3. **Wall Phasing**: Physical walls never stop Umbra! Within the permitted magical aura, Umbra can glide directly through walls to reach inaccessible alcoves and secrets.
4. **Shadow Stars & Runes**: Umbra can collect glowing **Shadow Stars** and activate ancient **Shadow Switches**.
5. **Enchanted Exit Portal**: When all required switches and stars in a chamber are activated, the exit door unlocks with a warm golden glow. Guide Lumi to the exit portal to clear the level!

---

## 🗺️ Exactly Three Handcrafted Levels

The game features three fully tested, genuinely solvable levels of progressive difficulty:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: LEARN THE SHADOW                                              │
│ • Gentle tutorial introducing Lumi, Umbra, Shadow Stars, and the Exit. │
│ • Drag your shadow onto the glowing star to open the doorway.          │
│ • Guide Lumi to the unlocked portal!                                   │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 2: BEHIND THE WALL                                               │
│ • Solid walls block Lumi from reaching the opposite side of the room.  │
│ • Learn that Umbra can glide right through walls to trigger switches. │
│ • Activating the switch unlocks the central gate and exit door.        │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 3: THE FINAL SHADOW CHALLENGE                                    │
│ • Coordinate both character movement and shadow dragging!              │
│ • Umbra has a magical tether aura centered around Lumi.                │
│ • Lumi must advance through corridors so Umbra can reach each chamber,│
│   collecting both stars and activating both switches for the victory! │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🕹️ Controls

| Action | Desktop Controls | Mobile / Touch Controls |
| :--- | :--- | :--- |
| **Move Lumi (Character)** | `Arrow Keys` or `W`, `A`, `S`, `D` | On-Screen Pastel D-Pad (bottom-left) |
| **Drag Umbra (Shadow)** | `Mouse Click & Drag` directly on shadow | `Touch & Drag` directly on shadow |
| **Restart Level** | Press `R` or click `🔄 Restart` icon | Tap `🔄 Restart` button on top HUD |
| **Get a Hint** | Click `💡 Hint` button on top HUD | Tap `💡 Hint` button |
| **How to Play** | Click `❓` button anytime during play | Tap `❓` button |
| **Audio & Settings** | Click `⚙️` button | Tap `⚙️` button |

---

## 🎶 Synthesized Web Audio System

**SHADOW SHOP** features a complete, gentle, built-in sound engine powered entirely by the browser's native **Web Audio API**:
- **Zero External Audio Files**: No broken audio links, missing assets, or slow loading times. 100% generated in real-time.
- **Dreamy Ambient Music**: Soft, relaxing pentatonic chord progressions with Rhodes/music-box timbres (lowpass-filtered sine/triangle waves).
- **Tactile Sound Effects**:
  - 🐾 *Step*: Gentle pitch-modulated pop on every step (throttled).
  - 🔮 *Shadow Drag*: Shimmering ethereal chime during continuous dragging.
  - ⭐ *Star Collect*: Sparkling ascending 4-note arpeggio.
  - 🔘 *Switch Activate*: Crisp tactile click paired with a resonant crystal bell.
  - 🚪 *Door Unlock*: Uplifting resonant major chord chime swell.
  - 🏆 *Victory Fanfare*: Joyful celebratory arpeggio.
  - 🔘 *Button Click*: Soft tactile UI tap.
- **Audio Controls**:
  - Independent **Music ON/OFF** and **Sound Effects ON/OFF** toggles.
  - Separate **Music Volume** and **SFX Volume** sliders (0% to 100%).
  - Immediate muting and unmuting.
  - Automatic persistence using `localStorage`.
  - Full compliance with modern browser autoplay policies (starts cleanly upon user interaction).

---

## 🎨 Visual Design & Aesthetics

- **Color Palette**: Twilight Lavender (`#140f26`), Pastel Purple (`#c084fc`), Soft Blue (`#38bdf8`), Magic Gold (`#facc15`), and Blush Pink (`#f472b6`).
- **Cute Character Design**: Adorable bunny-eared apprentice with blinking eyes, rosy cheeks, and walking animations.
- **Ethereal Shadow**: Pulsing translucent purple creature with glowing lilac eyes and trailing particle dust.
- **Target Pointers & Hints**: Helpful visual bouncing arrows guide beginners step-by-step.
- **Responsive Layout**: Seamless scaling across desktop monitors, laptops, tablets, and smartphones.

---

## 🛠️ Technology Stack

- **HTML5**: Semantic markup, accessible modal dialogs, and SVG icons.
- **CSS3**: Custom properties, soft gradients, responsive flex/grid, and smooth transitions.
- **Vanilla JavaScript (ES6+)**: Object-oriented engine with zero third-party libraries or frameworks.
- **HTML5 Canvas 2D**: High-DPI hardware-accelerated 60 FPS graphics.
- **Web Audio API**: Oscillator, BiquadFilter, and Gain-based synthesis.
- **Web Storage API (`localStorage`)**: Persists volume preferences, mute states, and unlocked level progression.

---

## 📂 Project Structure

```
shadow-shop/
├── index.html       # Game structure, HUD, Canvas container, and modals
├── style.css        # Indie aesthetic, animations, responsive layouts
├── script.js        # SoundManager, GameEngine, CanvasRenderer, UIController
└── README.md        # Documentation, controls, rules, and setup guide
```

---

## 🚀 Setup & How to Run Locally

Because this project is built entirely with standard web technologies and zero dependencies, running it is instantaneous:

### Option A: Double-Click (Direct Browser Launch)
1. Navigate to the project folder:
   ```
   C:\Users\Akansha D Kadam\.gemini\antigravity\scratch\shadow-shop
   ```
2. Double-click `index.html` to open it in Chrome, Edge, Firefox, or Safari.
3. Click anywhere or press **Play Game** to begin!

### Option B: Local Development Server (Recommended)
You can use any local server:

- **Using Python**:
  ```bash
  python -m http.server 8000
  ```
  Open [http://localhost:8000](http://localhost:8000) in your browser.

- **Using Node `npx serve`**:
  ```bash
  npx serve .
  ```

- **Using VS Code Live Server**:
  Right-click `index.html` and choose **"Open with Live Server"**.

---

## 🌐 How to Publish on GitHub Pages

Publishing **SHADOW SHOP** online for the world to play is completely free with **GitHub Pages**:

1. **Initialize Git & Commit**:
   ```bash
   cd shadow-shop
   git init
   git add .
   git commit -m "Initial commit of SHADOW SHOP game"
   ```

2. **Create a GitHub Repository**:
   - Go to [GitHub.com](https://github.com) and click **"New repository"**.
   - Name it `shadow-shop` (choose **Public**).
   - Do not initialize with a README (you already have one!).

3. **Push your code to GitHub**:
   ```bash
   git remote add origin https://github.com/<your-username>/shadow-shop.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - In your GitHub repository, click on **Settings** (gear icon).
   - In the left sidebar, click on **Pages**.
   - Under **Build and deployment > Source**, select **Deploy from a branch**.
   - Select branch: `main` and folder: `/ (root)`.
   - Click **Save**.

5. **Play Online**:
   After 1–2 minutes, your game will be live at:
   `https://<your-username>.github.io/shadow-shop/`

---

## 📸 Screenshots & Previews

<!-- Placeholders for gameplay screenshots -->
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                    [ SCREENSHOT 1 ]                    │
│     Home Menu with Cute Lumi & Umbra Character Duo     │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    [ SCREENSHOT 2 ]                    │
│    Level 1: Learning the Shadow & Collecting Stars     │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    [ SCREENSHOT 3 ]                    │
│      Level 2: Dragging Shadow Through Solid Walls      │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    [ SCREENSHOT 4 ]                    │
│   Level 3: Multi-Chamber Final Challenge & Confetti    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 📜 License

Created with ❤️ for puzzle game lovers everywhere. Open source under the [MIT License](https://opensource.org/licenses/MIT).
