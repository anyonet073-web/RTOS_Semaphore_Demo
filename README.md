# ⚡ RTOS Semaphore Lab
### Embedded Systems — Interactive Classroom Demonstration

An interactive, dual-panel terminal simulator for teaching **Race Conditions** and **Semaphore Synchronization** in RTOS, built for the **Embedded Systems** subject.

Both panels play side-by-side so students instantly see *what goes wrong* without a semaphore and *why it works* with one — at the same moment in simulated time.

---

## 🚀 Quick Launch

| Method | Steps |
|--------|-------|
| **One-Click** | Double-click `launch_demo.bat` |
| **Browser** | Double-click `index.html` in Chrome / Edge / Firefox / Brave |

> **100% offline & client-side.** No server, no Node.js, no npm — open and it works.

---

## 🖥️ Interface Overview

```
┌─────────────────────────────────────────────────────┐
│ ⚡ RTOS Semaphore Lab  [Counter][Bank][UART]  Controls│  ← Header
├─────────────────────────────────────────────────────┤
│ 💡 Scenario banner — context + shared resource decl  │  ← Banner
├──────────────────────────┬──────────────────────────┤
│  Race Condition (No Sync)│  Semaphore (Synchronized) │
│  ┌────────────────────┐  │  ┌────────────────────┐  │
│  │  Terminal output   │  │  │  Terminal output   │  │  ← Simulation
│  └────────────────────┘  │  └────────────────────┘  │
│  // C Reference panel    │  // FreeRTOS API panel    │  ← Live C code
│  [▶][⏭][═══════][1×][3/8]│  [▶][⏭][═══════][1×][3/11]│ ← Player bar
├──────────────────────────┴──────────────────────────┤
│  Space · → · R · 1 2 3 · S · T · F  (keyboard bar)  │  ← Shortcut hints
└─────────────────────────────────────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause both panels |
| `→` | Step both panels one event forward |
| `R` | Reset both panels to initial state |
| `1` | Switch to **Counter** scenario |
| `2` | Switch to **Bank Account** scenario |
| `3` | Switch to **UART Serial** scenario |
| `S` | Toggle sound effects |
| `T` | Cycle through colour themes |
| `F` | Toggle fullscreen |

> **Presenter tip:** Use `Space` and `→` with a wireless clicker or presentation remote — no mouse needed.

---

## 📚 Demonstration Scenarios

### 1 — Shared Counter (`volatile int`)
> *"Task 1 adds +50. Task 2 adds +75. Both start from 100. What should the final value be?"*

| | Race Condition | Semaphore |
|--|--|--|
| Expected | 225 | 225 |
| **Actual** | **150 ❌** | **225 ✅** |
| Lost | 75 units | 0 units |

**What happens:** Task 1 reads `shared_count = 100` into a CPU register, then SysTick preempts it. Task 2 reads the same stale `100`, computes and writes `175`. Task 1 resumes with its saved register (`150`) and overwrites Task 2's result. 75 units vanish silently.

**C code shown:**
```c
// Race — no protection
int tmp1 = shared_count;          // stale read
shared_count = result1;           // overwrites Task 2's write ❌

// Semaphore — FreeRTOS API
xSemaphoreTake(xBinSem, portMAX_DELAY);  // P() / wait
shared_count = result;                    // atomic write ✅
xSemaphoreGive(xBinSem);                 // V() / signal
```

---

### 2 — Bank Account (`double`)
> *"ATM withdraws $400. Mobile deposits $500. Account starts at $1,000."*

| | Race Condition | Semaphore |
|--|--|--|
| Expected | $1,100 | $1,100 |
| **Actual** | **$600 ❌** | **$1,100 ✅** |
| Lost | $500 deposit | nothing |

**What happens:** ATM reads `$1,000`, gets preempted. Mobile reads the same stale `$1,000` and deposits, writing `$1,500`. ATM resumes with its saved register (`$600`) and overwrites — Mobile's `$500` deposit is permanently destroyed.

**C code shown:**
```c
// Race
double tmp_mob = account_balance;    // $1,000 — STALE!
account_balance = new_atm;           // $600 overwrites $1,500 ❌

// Semaphore
xSemaphoreTake(xAccSem, portMAX_DELAY);
account_balance = tmp + 500.0;       // $1,100 ✅
xSemaphoreGive(xAccSem);
```

---

### 3 — UART Serial Port (`HAL_UART_Transmit`)
> *"Telemetry sends sensor data. Fire alarm sends alert. Same UART peripheral."*

| | Race Condition | Semaphore |
|--|--|--|
| Telemetry frame | corrupted | `[SENSOR: 24C]\n` ✅ |
| Alarm frame | corrupted | `<ALARM:FIRE>\n` ✅ |
| Result | `[SENS<ALARMOR: 24C]:FIRE>` ❌ | both frames intact ✅ |

**What happens:** Telemetry is mid-transmission when the alarm task preempts it. Both tasks write directly to the UART data register — bytes interleave on the wire, producing garbage that no parser can decode. The fire alarm is effectively silenced.

**C code shown:**
```c
// Race — direct HAL call, no lock
HAL_UART_Transmit(&huart1, "[SENS", 5, 100);
// ← preempted here
HAL_UART_Transmit(&huart1, "<ALARM", 6, 100);  // INTERLEAVED ❌

// Semaphore — exclusive bus access
xSemaphoreTake(xUartSem, portMAX_DELAY);
HAL_UART_Transmit(&huart1, "[SENSOR: 24C]\n", 14, 100);  // ✅
xSemaphoreGive(xUartSem);
```

---

## 🎛️ Player Controls

Each terminal panel has its own independent player bar:

| Control | Description |
|---------|-------------|
| `▶` / `❚❚` | Play or pause this panel individually |
| `⏭` | Advance one event at a time (step mode) |
| `↺` | Reset this panel |
| `[═══]` | Progress scrubber — click anywhere to seek |
| `½×` `1×` `2×` | Playback speed |
| `3/8` | Step counter — current event out of total |

The **master controls** in the header operate **both panels simultaneously** for synchronized side-by-side comparison.

---

## 🎨 Colour Themes

Press `T` or click 🎨 to cycle:

| Theme | Style |
|-------|-------|
| **Slate** (default) | Deep blue-black, neon cyan/green |
| **Matrix** | Pure black, green-on-black |
| **Amber** | Dark brown, amber CRT monitor |
| **Cyber** | Deep purple, magenta/cyan cyberpunk |

---

## 🏗️ Project Structure

```
Demonstration/
├── index.html              Main application page
├── launch_demo.bat         One-click launcher
├── css/
│   └── terminal.css        All styles, themes, animations
└── js/
    ├── scenarios.js        Event data + FreeRTOS C code snippets
    ├── asciinema-player.js Terminal player engine (step, seek, glitch, code panel)
    ├── sync-controller.js  Master sync, keyboard shortcuts, banner updates
    └── audio.js            Web Audio API synthesized sound effects
```

---

## 🔊 Sound Effects

| Event | Sound |
|-------|-------|
| SysTick preemption / context switch | Short sawtooth sweep |
| Race condition hazard / data corruption | Low warning tone |
| Semaphore `wait()` lock acquired | Rising sine chirp |
| Semaphore `post()` unlock / signal | High sine chirp |
| Final success result | Three-note ascending triangle wave |

Sound is **muted by default**. Press `S` or click 🔇 to enable.

---

## 💡 Teaching Notes

### Suggested Classroom Flow

1. **Introduce the resource** — point to the banner: *"Here's our shared variable. Two RTOS tasks will both try to modify it."*
2. **Run Race Condition first** — press `Space` on the Counter scenario. Let it play to the ❌ alert.
3. **Step through slowly** — press `R`, then `→` repeatedly to walk through each CPU event. Explain the stale register value.
4. **Run Semaphore side** — press `R` again and use `→` to step through `xSemaphoreTake()` → BLOCKED → `xSemaphoreGive()` → unblocked.
5. **Switch scenarios** — press `2` for Bank, `3` for UART. Reinforce the same root cause in different real-world contexts.
6. **Quiz the class** — *"Why does Task 2 read 100 even after Task 1 computed 150?"*

### Key Concepts Demonstrated

- **Non-atomic read-modify-write** on shared memory
- **Context switch timing** via SysTick interrupt (`PUSH/POP {r0-r12}`)
- **Semaphore P (wait) and V (signal)** — Dijkstra's original operations
- **Blocked wait queue** — task state transitions: `RUNNING → BLOCKED → READY → RUNNING`
- **Critical section** — the region between `take` and `give` that executes atomically

### RTOS API Reference Shown

All C snippets use the **FreeRTOS** API, which is the standard for STM32, ESP32, and most ARM Cortex-M RTOS projects:

```c
SemaphoreHandle_t xBinSem = xSemaphoreCreateBinary();

// Producer / Task 1
xSemaphoreTake(xBinSem, portMAX_DELAY);  // P() — blocks if count = 0
  /* Critical Section */
xSemaphoreGive(xBinSem);                 // V() — unblocks waiting task

// From ISR context
xSemaphoreGiveFromISR(xBinSem, &xHigherPriorityTaskWoken);
portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
```

---

## 📋 Requirements

- Any modern browser (Chrome 80+, Edge 80+, Firefox 75+, Brave, Safari 14+)
- No internet connection required after the page loads (fonts load from Google Fonts on first open)
- No installation, no build tools, no dependencies
