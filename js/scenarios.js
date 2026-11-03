/* ==========================================================================
   RTOS-CoreTerm: Classroom Demonstration Scenarios
   Subject: Embedded Systems — RTOS Semaphore & Race Condition
   Each event includes:
     html  — terminal output line
     code  — real FreeRTOS C API snippet shown in the Code Reference panel
     sound — audio cue identifier
     state — live HUD badge update
   ========================================================================== */

const SCENARIOS = {
  counter: {
    id: 'counter',
    name: 'count',
    initialDisplay: 'count: 100',
    desc: 'Two tasks increment a shared <code>volatile int</code> counter. Without synchronization, the CPU register holds a stale value after a context switch — classic read-modify-write race.',
    resource: 'volatile int shared_count = 100;',

    race: {
      duration: 8.0,
      initialState: { resourceValue: 'count: 100' },
      events: [
        {
          time: 0.8,
          html: `<span class="term-task1">Task 1:</span> Read count = 100`,
          code: `// Task 1 — NO synchronization primitive\nint tmp1 = shared_count;   // READ [mem] → reg\n// tmp1 = 100`,
          state: { resourceValue: 'count: 100' }
        },
        {
          time: 1.6,
          html: `<span class="term-task1">Task 1:</span> Compute 100 + 50 = 150`,
          code: `int result1 = tmp1 + 50;   // COMPUTE in CPU register\n// result1 = 150  ← stored in r0, NOT written to [mem] yet!`,
          state: { resourceValue: 'count: 100' }
        },
        {
          time: 2.4,
          html: `<span class="term-preempt">⚡ SysTick: Preempts Task 1</span>`,
          code: `// ⚡ SysTick ISR fires (configTICK_RATE_HZ = 1000)\n// PUSH {r0-r12, lr}     ← Task 1 context saved to stack\n// vTaskSwitchContext()   ← Scheduler picks Task 2`,
          sound: 'preempt',
          state: { resourceValue: 'count: 100' }
        },
        {
          time: 3.2,
          html: `<span class="term-task2">Task 2:</span> Read count = <span class="term-danger">100 (stale)</span>`,
          code: `// Task 2 runs — shared_count NOT yet updated!\nint tmp2 = shared_count;   // READ [mem] → reg\n// tmp2 = 100  ← STALE VALUE! Task 1's write pending`,
          sound: 'hazard',
          state: { resourceValue: 'count: 100 (stale)' }
        },
        {
          time: 4.0,
          html: `<span class="term-task2">Task 2:</span> Write count = <span class="term-hl">175</span>`,
          code: `shared_count = tmp2 + 75;  // WRITE [mem] ← 175\n// Task 2 finishes and exits critical region`,
          state: { resourceValue: 'count: 175' }
        },
        {
          time: 4.8,
          html: `<span class="term-preempt">⚡ SysTick: Resume Task 1</span>`,
          code: `// SysTick restores Task 1 register context\n// POP {r0-r12, pc}      ← result1 = 150 back in r0!\n// Task 1 resumes AFTER the read — about to write stale result`,
          sound: 'preempt',
          state: { resourceValue: 'count: 175' }
        },
        {
          time: 5.6,
          html: `<span class="term-task1">Task 1:</span> Write count = <span class="term-danger">150 (overwrite)</span>`,
          code: `shared_count = result1;    // WRITE [mem] ← 150 ❌\n// Task 2's write (175) is PERMANENTLY DESTROYED!\n// Lost 75 units — silent memory corruption`,
          sound: 'hazard',
          state: { resourceValue: 'count: 150 (corrupt)' }
        },
        {
          time: 6.6,
          html: `<div class="term-alert-box error">❌ Race Hazard: Expected 225, Got 150 (−75 lost)</div>`,
          code: `/* POST-MORTEM ANALYSIS\n   Expected : 100 + 50 + 75 = 225\n   Actual   : 150  ← 75 updates permanently lost!\n   Root cause: Non-atomic read-modify-write on shared_count */`,
          sound: 'hazard',
          state: { resourceValue: 'count: 150 ❌' }
        }
      ]
    },

    semaphore: {
      duration: 8.8,
      initialState: { resourceValue: 'count: 100' },
      events: [
        {
          time: 0.8,
          html: `<span class="term-task1">Task 1:</span> wait(sem) &rarr; <span class="term-ok">🔒 Locked</span>`,
          code: `// Task 1 acquires semaphore  (Dijkstra P / wait)\nxSemaphoreTake(xBinSem, portMAX_DELAY);\n// sem.count: 1 → 0  |  Critical Section entered`,
          sound: 'lock',
          state: { resourceValue: 'count: 100 [🔒 T1]' }
        },
        {
          time: 1.6,
          html: `<span class="term-task1">Task 1:</span> Read 100, Compute 150`,
          code: `// ✅ Inside Critical Section — fully protected\nint tmp1 = shared_count;   // READ  = 100\nint result = tmp1 + 50;    // COMPUTE = 150`,
          state: { resourceValue: 'count: 100 [🔒 T1]' }
        },
        {
          time: 2.4,
          html: `<span class="term-preempt">⚡ SysTick: Preempts Task 1</span>`,
          code: `// ⚡ SysTick → vTaskSwitchContext()\n// Task 1 preempted BUT semaphore still held!\n// sem.count = 0  → no other task can enter CS`,
          sound: 'preempt',
          state: { resourceValue: 'count: 100 [🔒 T1]' }
        },
        {
          time: 3.2,
          html: `<span class="term-task2">Task 2:</span> wait(sem) &rarr; <span class="term-warn">⛔ BLOCKED in queue</span>`,
          code: `// Task 2 calls P() — sem.count = 0\nxSemaphoreTake(xBinSem, portMAX_DELAY);\n// BLOCKS → moved to semaphore wait queue\n// CPU returns to Task 1 or idle`,
          sound: 'lock',
          state: { resourceValue: 'count: 100 [T2 BLOCKED]' }
        },
        {
          time: 4.0,
          html: `<span class="term-preempt">⚡ SysTick: Resume Task 1</span>`,
          code: `// Scheduler resumes Task 1 (sem still held by T1)\n// Task 2 remains blocked in wait queue`,
          sound: 'preempt',
          state: { resourceValue: 'count: 100 [🔒 T1]' }
        },
        {
          time: 4.8,
          html: `<span class="term-task1">Task 1:</span> Write count = <span class="term-hl">150</span>`,
          code: `shared_count = result;     // WRITE [mem] ← 150\n// Atomic write inside protected Critical Section`,
          state: { resourceValue: 'count: 150 [🔒 T1]' }
        },
        {
          time: 5.4,
          html: `<span class="term-task1">Task 1:</span> post(sem) &rarr; <span class="term-ok">🔓 Unlocked</span>`,
          code: `// Task 1 releases semaphore  (Dijkstra V / signal)\nxSemaphoreGive(xBinSem);\n// sem.count: 0 → 1  |  Task 2 unblocked from queue!`,
          sound: 'unlock',
          state: { resourceValue: 'count: 150 [🔓 FREE]' }
        },
        {
          time: 6.2,
          html: `<span class="term-task2">Task 2:</span> Wakes up &rarr; <span class="term-ok">🔒 Locked</span>`,
          code: `// Task 2: wait queue → READY → RUNNING\n// xSemaphoreTake() returns pdTRUE\n// sem.count: 1 → 0  |  CS entered by Task 2`,
          sound: 'lock',
          state: { resourceValue: 'count: 150 [🔒 T2]' }
        },
        {
          time: 7.0,
          html: `<span class="term-task2">Task 2:</span> Read 150, Write count = <span class="term-ok">225</span>`,
          code: `int tmp2 = shared_count;   // READ  = 150 (correct!)\nshared_count = tmp2 + 75;  // WRITE [mem] ← 225 ✅`,
          state: { resourceValue: 'count: 225 [🔒 T2]' }
        },
        {
          time: 7.6,
          html: `<span class="term-task2">Task 2:</span> post(sem) &rarr; <span class="term-ok">🔓 Unlocked</span>`,
          code: `xSemaphoreGive(xBinSem);   // V()  — CS exited\n// sem.count: 0 → 1  |  Resource free for next task`,
          sound: 'unlock',
          state: { resourceValue: 'count: 225 [🔓 FREE]' }
        },
        {
          time: 8.2,
          html: `<div class="term-alert-box success">✅ Synchronized: Final count = 225</div>`,
          code: `/* RESULT: 100 + 50 + 75 = 225  ✅\n   Zero data loss. Semaphore enforces atomicity\n   of the entire read-modify-write sequence. */`,
          sound: 'success',
          state: { resourceValue: 'count: 225 ✅' }
        }
      ]
    }
  },

  // ── Bank Account ────────────────────────────────────────────────────────────
  bank: {
    id: 'bank',
    name: 'balance',
    initialDisplay: 'balance: $1,000',
    desc: 'ATM withdrawal and Mobile deposit run concurrently on the same bank account. A preemption between read and write causes the deposit to be silently overwritten.',
    resource: 'double account_balance = 1000.0;',

    race: {
      duration: 8.0,
      initialState: { resourceValue: 'balance: $1,000' },
      events: [
        {
          time: 0.8,
          html: `<span class="term-task1">ATM:</span> Read balance = $1,000`,
          code: `// ATM task — NO lock held\ndouble tmp_atm = account_balance; // READ = $1,000`,
          state: { resourceValue: 'balance: $1,000' }
        },
        {
          time: 1.6,
          html: `<span class="term-task1">ATM:</span> Compute $1,000 − $400 = $600`,
          code: `double new_atm = tmp_atm - 400.0;  // $600\n// Result in CPU register — NOT written yet`,
          state: { resourceValue: 'balance: $1,000' }
        },
        {
          time: 2.4,
          html: `<span class="term-preempt">⚡ SysTick: Preempts ATM</span>`,
          code: `// ⚡ SysTick → vTaskSwitchContext()\n// ATM context saved (new_atm = $600 in r0)\n// Scheduler dispatches Mobile task`,
          sound: 'preempt',
          state: { resourceValue: 'balance: $1,000' }
        },
        {
          time: 3.2,
          html: `<span class="term-task2">Mobile:</span> Read balance = <span class="term-danger">$1,000 (stale)</span>`,
          code: `// Mobile task reads — ATM write NOT done yet!\ndouble tmp_mob = account_balance; // READ = $1,000\n// STALE! ATM's debit is invisible`,
          sound: 'hazard',
          state: { resourceValue: 'balance: $1,000 (stale)' }
        },
        {
          time: 4.0,
          html: `<span class="term-task2">Mobile:</span> Write balance = <span class="term-hl">$1,500</span>`,
          code: `account_balance = tmp_mob + 500.0; // WRITE ← $1,500\n// Mobile's deposit committed based on stale read`,
          state: { resourceValue: 'balance: $1,500' }
        },
        {
          time: 4.8,
          html: `<span class="term-preempt">⚡ SysTick: Resume ATM</span>`,
          code: `// ATM restored from saved context\n// POP {r0-r12, pc}  ← new_atm = $600 back in r0`,
          sound: 'preempt',
          state: { resourceValue: 'balance: $1,500' }
        },
        {
          time: 5.6,
          html: `<span class="term-task1">ATM:</span> Write balance = <span class="term-danger">$600 (overwrite)</span>`,
          code: `account_balance = new_atm;  // WRITE ← $600 ❌\n// Mobile's $500 deposit PERMANENTLY LOST!\n// Bank ledger now shows $600 instead of $1,100`,
          sound: 'hazard',
          state: { resourceValue: 'balance: $600 (corrupt)' }
        },
        {
          time: 6.6,
          html: `<div class="term-alert-box error">❌ Race Hazard: Expected $1,100, Got $600 ($500 lost)</div>`,
          code: `/* POST-MORTEM:\n   Expected : $1,000 − $400 + $500 = $1,100\n   Actual   : $600   ← $500 deposit vanished!\n   This is a real financial system bug! */`,
          sound: 'hazard',
          state: { resourceValue: 'balance: $600 ❌' }
        }
      ]
    },

    semaphore: {
      duration: 8.8,
      initialState: { resourceValue: 'balance: $1,000' },
      events: [
        {
          time: 0.8,
          html: `<span class="term-task1">ATM:</span> wait(sem) &rarr; <span class="term-ok">🔒 Locked</span>`,
          code: `// ATM acquires account semaphore (P operation)\nxSemaphoreTake(xAccSem, portMAX_DELAY);\n// sem.count: 1 → 0  |  Ledger locked by ATM`,
          sound: 'lock',
          state: { resourceValue: 'balance: $1,000 [🔒 ATM]' }
        },
        {
          time: 1.6,
          html: `<span class="term-task1">ATM:</span> Read $1,000, Compute $600`,
          code: `// ✅ Inside Critical Section\ndouble tmp = account_balance;  // $1,000\ndouble new_bal = tmp - 400.0;  // $600`,
          state: { resourceValue: 'balance: $1,000 [🔒 ATM]' }
        },
        {
          time: 2.4,
          html: `<span class="term-preempt">⚡ SysTick: Preempts ATM</span>`,
          code: `// ⚡ SysTick → vTaskSwitchContext()\n// ATM preempted BUT xAccSem still held!\n// sem.count = 0  → Mobile cannot enter`,
          sound: 'preempt',
          state: { resourceValue: 'balance: $1,000 [🔒 ATM]' }
        },
        {
          time: 3.2,
          html: `<span class="term-task2">Mobile:</span> wait(sem) &rarr; <span class="term-warn">⛔ BLOCKED in queue</span>`,
          code: `xSemaphoreTake(xAccSem, portMAX_DELAY);\n// sem.count = 0  → Mobile task BLOCKS\n// Added to semaphore wait queue`,
          sound: 'lock',
          state: { resourceValue: 'balance: $1,000 [BLOCKED]' }
        },
        {
          time: 4.0,
          html: `<span class="term-preempt">⚡ SysTick: Resume ATM</span>`,
          code: `// Scheduler: ATM has higher priority → resumes\n// Mobile stays in wait queue`,
          sound: 'preempt',
          state: { resourceValue: 'balance: $1,000 [🔒 ATM]' }
        },
        {
          time: 4.8,
          html: `<span class="term-task1">ATM:</span> Write balance = <span class="term-hl">$600</span>`,
          code: `account_balance = new_bal;  // WRITE ← $600\n// Atomic, protected write inside CS`,
          state: { resourceValue: 'balance: $600 [🔒 ATM]' }
        },
        {
          time: 5.4,
          html: `<span class="term-task1">ATM:</span> post(sem) &rarr; <span class="term-ok">🔓 Unlocked</span>`,
          code: `xSemaphoreGive(xAccSem);   // V() — CS exited\n// sem.count: 0 → 1  |  Mobile unblocked!`,
          sound: 'unlock',
          state: { resourceValue: 'balance: $600 [🔓 FREE]' }
        },
        {
          time: 6.2,
          html: `<span class="term-task2">Mobile:</span> Wakes up &rarr; <span class="term-ok">🔒 Locked</span>`,
          code: `// Mobile: wait queue → READY → RUNNING\n// xSemaphoreTake() returns pdTRUE\n// sem.count: 1 → 0`,
          sound: 'lock',
          state: { resourceValue: 'balance: $600 [🔒 MOBILE]' }
        },
        {
          time: 7.0,
          html: `<span class="term-task2">Mobile:</span> Read $600, Write balance = <span class="term-ok">$1,100</span>`,
          code: `double tmp2 = account_balance;     // READ  = $600 ✅\naccount_balance = tmp2 + 500.0;    // WRITE ← $1,100`,
          state: { resourceValue: 'balance: $1,100 [🔒 MOBILE]' }
        },
        {
          time: 7.6,
          html: `<span class="term-task2">Mobile:</span> post(sem) &rarr; <span class="term-ok">🔓 Unlocked</span>`,
          code: `xSemaphoreGive(xAccSem);   // V() — ledger unlocked\n// sem.count: 0 → 1  |  Resource free`,
          sound: 'unlock',
          state: { resourceValue: 'balance: $1,100 [🔓 FREE]' }
        },
        {
          time: 8.2,
          html: `<div class="term-alert-box success">✅ Synchronized: Final balance = $1,100</div>`,
          code: `/* RESULT: $1,000 − $400 + $500 = $1,100  ✅\n   Ledger integrity preserved.\n   Both transactions committed atomically. */`,
          sound: 'success',
          state: { resourceValue: 'balance: $1,100 ✅' }
        }
      ]
    }
  },

  // ── UART Serial Port ─────────────────────────────────────────────────────────
  uart: {
    id: 'uart',
    name: 'uart',
    initialDisplay: 'uart: idle',
    desc: 'Sensor telemetry and emergency fire alarm both transmit on the same UART hardware peripheral. Interleaved bytes produce unparsable garbage frames.',
    resource: 'UART_HandleTypeDef huart1;  // Shared STM32 UART',

    race: {
      duration: 7.5,
      initialState: { resourceValue: 'uart: idle' },
      events: [
        {
          time: 0.8,
          html: `<span class="term-task1">Telemetry:</span> Sends "[SENS"`,
          code: `// Telemetry task — direct HAL call, no lock\nHAL_UART_Transmit(&huart1,\n  (uint8_t*)"[SENS", 5, 100);\n// 5 bytes sent to UART DR register`,
          state: { resourceValue: 'uart: "[SENS"' }
        },
        {
          time: 1.8,
          html: `<span class="term-preempt">⚡ SysTick: Preempts Telemetry</span>`,
          code: `// ⚡ SysTick → vTaskSwitchContext()\n// Telemetry suspended mid-transmission!\n// UART DR register still active`,
          sound: 'preempt',
          state: { resourceValue: 'uart: "[SENS"' }
        },
        {
          time: 2.6,
          html: `<span class="term-task2">Alarm:</span> Sends "&lt;ALARM"`,
          code: `// Alarm task fires — no synchronization!\nHAL_UART_Transmit(&huart1,\n  (uint8_t*)"<ALARM", 6, 100);\n// INTERLEAVED with Telemetry bytes! ❌`,
          sound: 'hazard',
          state: { resourceValue: 'uart: "[SENS<ALARM"' }
        },
        {
          time: 3.6,
          html: `<span class="term-preempt">⚡ SysTick: Resume Telemetry</span>`,
          code: `// SysTick restores Telemetry context\n// Continues sending remaining bytes`,
          sound: 'preempt',
          state: { resourceValue: 'uart: "[SENS<ALARM"' }
        },
        {
          time: 4.4,
          html: `<span class="term-task1">Telemetry:</span> Sends "OR: 24C]"`,
          code: `HAL_UART_Transmit(&huart1,\n  (uint8_t*)"OR: 24C]", 8, 100);\n// Mixed with Alarm bytes on the wire`,
          state: { resourceValue: 'uart: "[SENS<ALARMOR: 24C]"' }
        },
        {
          time: 5.2,
          html: `<span class="term-task2">Alarm:</span> Sends ":FIRE&gt;"`,
          code: `HAL_UART_Transmit(&huart1,\n  (uint8_t*)":FIRE>", 6, 100);\n// Final bytes — completely garbled stream`,
          sound: 'hazard',
          state: { resourceValue: 'uart: "[SENS<ALARMOR: 24C]:FIRE>"' }
        },
        {
          time: 6.2,
          html: `<div class="term-alert-box error">❌ Collision: "[SENS&lt;ALARMOR: 24C]:FIRE&gt;" (corrupted)</div>`,
          code: `/* POST-MORTEM:\n   Receiver gets : "[SENS<ALARMOR: 24C]:FIRE>"\n   Parser fails  : neither frame is decodable\n   Fire alarm MISSED — safety-critical failure! */`,
          sound: 'hazard',
          state: { resourceValue: 'uart: corrupted ❌' }
        }
      ]
    },

    semaphore: {
      duration: 8.2,
      initialState: { resourceValue: 'uart: idle' },
      events: [
        {
          time: 0.8,
          html: `<span class="term-task1">Telemetry:</span> wait(sem) &rarr; <span class="term-ok">🔒 Locked</span>`,
          code: `// Telemetry acquires UART bus semaphore (P)\nxSemaphoreTake(xUartSem, portMAX_DELAY);\n// sem.count: 1 → 0  |  UART bus exclusively locked`,
          sound: 'lock',
          state: { resourceValue: 'uart: locked (telemetry)' }
        },
        {
          time: 1.6,
          html: `<span class="term-task1">Telemetry:</span> Sends "[SENSOR: 24C]\\n"`,
          code: `// ✅ Sends complete frame — bus is exclusively held\nHAL_UART_Transmit(&huart1,\n  (uint8_t*)"[SENSOR: 24C]\\n", 14, 100);\n// Full 14-byte frame transmitted intact`,
          state: { resourceValue: 'uart: "[SENSOR: 24C]"' }
        },
        {
          time: 2.6,
          html: `<span class="term-task2">Alarm:</span> wait(sem) &rarr; <span class="term-warn">⛔ BLOCKED in queue</span>`,
          code: `// Alarm needs UART — sem.count = 0\nxSemaphoreTake(xUartSem, portMAX_DELAY);\n// BLOCKS → added to semaphore wait queue`,
          sound: 'lock',
          state: { resourceValue: 'uart: alarm blocked' }
        },
        {
          time: 3.6,
          html: `<span class="term-task1">Telemetry:</span> post(sem) &rarr; <span class="term-ok">🔓 Unlocked</span>`,
          code: `// Telemetry done — releases UART bus (V)\nxSemaphoreGive(xUartSem);\n// sem.count: 0 → 1  |  Alarm unblocked!`,
          sound: 'unlock',
          state: { resourceValue: 'uart: unlocked' }
        },
        {
          time: 4.6,
          html: `<span class="term-task2">Alarm:</span> Wakes up &rarr; <span class="term-ok">🔒 Locked</span>`,
          code: `// Alarm: wait queue → READY → RUNNING\n// xSemaphoreTake() returns pdTRUE\n// sem.count: 1 → 0  |  UART bus locked by Alarm`,
          sound: 'lock',
          state: { resourceValue: 'uart: locked (alarm)' }
        },
        {
          time: 5.4,
          html: `<span class="term-task2">Alarm:</span> Sends "&lt;ALARM:FIRE&gt;\\n"`,
          code: `// ✅ Alarm sends complete frame exclusively\nHAL_UART_Transmit(&huart1,\n  (uint8_t*)"<ALARM:FIRE>\\n", 13, 100);\n// Clean 13-byte frame, no interference`,
          state: { resourceValue: 'uart: "<ALARM:FIRE>"' }
        },
        {
          time: 6.2,
          html: `<span class="term-task2">Alarm:</span> post(sem) &rarr; <span class="term-ok">🔓 Unlocked</span>`,
          code: `xSemaphoreGive(xUartSem);\n// sem.count: 0 → 1  |  UART bus free`,
          sound: 'unlock',
          state: { resourceValue: 'uart: unlocked' }
        },
        {
          time: 7.2,
          html: `<div class="term-alert-box success">✅ Clean: Both packets intact (0 bytes lost)</div>`,
          code: `/* RESULT:\n   Frame 1: "[SENSOR: 24C]\\n"   ✅ parseable\n   Frame 2: "<ALARM:FIRE>\\n"   ✅ parseable\n   Serial bus arbitration via semaphore = safe! */`,
          sound: 'success',
          state: { resourceValue: 'uart: clean ✅' }
        }
      ]
    }
  }
};
