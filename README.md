# Train Zimulator

A modular, web-based, first-person locomotive simulator built with **Vue 3 + TypeScript + Vite + Three.js + Pinia + GSAP**. The experience is entirely cab-based: you sit in the driver's seat, look around with the mouse/controller, and operate clickable controls that drive a realistic physics simulation.

This repository is a **scalable foundation** designed to grow toward multiple locomotives, routes, signalling systems, weather, AI traffic and multiplayer.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Click the page once to enable audio.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Look around | Click to capture, move mouse | Axis 0 (left/right) · Axis 1 (up/down) |
| Power / brake lever | `W` (power) · `S` (brake) | Axis 2 (forward/back) · D-pad Up/Down |
| Horn | `Space` | Button 10 |
| Doors open/close | `O` | Button 11 |
| Interact (click control) | `F` or left click | A |
| Pause / HUD / Debug | `Esc` / `G` / `` ` `` | Menu / View |

The engine starts automatically — pull the lever forward (`W`) to move, backward (`S`) to brake.

## Architecture

Strict separation between **deterministic simulation** (fixed timestep) and **presentation** (rendering + reactive UI), connected through a flat snapshot pushed into a Pinia store.

```
src/
  engine/        constants, math, typed event bus
  data/          JSON content schemas (LocomotiveSpec, RouteSpec, …)
  core/          Renderer · SceneManager · AssetManager · ContentLoader
                 GameLoop · SettingsManager · SaveManager · input/
  simulation/    Physics · BrakeSystem · power/ (IPowerUnit, Diesel)
                 Train · Controls · Environment · SignalSystem
                 RouteManager · AITrain · Simulation
  world/         Track(spline) · Terrain · TrackMesh · Scenery
                 Stations · SignalMast · Weather · World
  cab/           CabCamera · CabModel · Interaction · Gauges
                 Cab · CabController
  audio/         AudioEngine · EngineAudio · AmbientAudio
                 PositionalAudio · SoundController
  ui/            types · snapshot + components/ (HUD, PauseMenu, Debug, …)
  stores/        Pinia bridge
  Game.ts        top-level orchestrator wiring every subsystem
```

### Key design points

- **Fixed-timestep loop** (`GameLoop`, 120 Hz) keeps physics deterministic and stable independent of frame rate; rendering runs every animation frame.
- **Action-based input** (`core/input`): keyboard, mouse and gamepad map to abstract actions, so rebinding and new devices are trivial. The simulation never sees raw input.
- **Interfaces for extensibility**: `IPowerUnit` (diesel today; electric/steam drop in), `ITrackProvider` (spline today). Locomotive/route content is pure JSON in `public/data/`.
- **Physically based rendering**: ACES tone mapping, sRGB, shadow maps, atmospheric `Sky`, dynamic sun from the time-of-day clock, exponential fog, optional bloom. Instanced sleepers/scenery and a single moving cab keep draw calls low.
- **Realistic systems**: Davis resistance, adhesion-limited tractive effort with wheel slip & sanding, gradient forces; a Westinghouse-style air brake with brake-pipe propagation; diesel RPM/turbo-lag/fuel/temperature; four-aspect block signalling that AI trains obey.

### Adding content

Drop a new file in `public/data/locomotives/` or `public/data/routes/` and list it in `manifest.json`. No code changes required to add a locomotive or route.

## Status & roadmap

Implemented: rendering, cab camera & clickable controls, diesel power, air brakes, physics, spline track, terrain/scenery/stations, block signalling, one AI train, weather & time-of-day, 3D-driven procedural audio, HUD, pause/settings menu, debug overlay, save/load.

Designed-for (next): GLB cab/locomotive models, electric & steam power units, switches/junctions, route & scenario editors, multiplayer and a plugin/mod system.
