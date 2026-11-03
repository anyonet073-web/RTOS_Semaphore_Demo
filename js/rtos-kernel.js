/* ==========================================================================
   RTOS-CoreTerm: Real-Time Operating System Kernel Simulator
   Implements:
   - Task Control Block (TCB) & Priority Preemptive Scheduler
   - Mutex with Strict Ownership & Priority Inheritance Protocol (PIP)
   - Binary Semaphore (Signaling / Synchronization / ISR integration)
   - Counting Semaphore (Resource Counting Pool / Bounded Buffer)
   - RTOS Mailbox IPC Demo
   ========================================================================== */

class TaskControlBlock {
  constructor(id, name, priority, stackPointer = '0x20001800') {
    this.id = id;
    this.name = name;
    this.basePriority = priority; // 1 (lowest) to 10 (highest)
    this.currentPriority = priority;
    this.state = 'READY'; // READY, RUNNING, BLOCKED, SUSPENDED
    this.stackPointer = stackPointer;
    this.blockedOn = null; // Name of sync primitive currently blocking this task
    this.acquiredResources = []; // List of mutexes/resources held
    this.programCounter = 0x08000100 + Math.floor(Math.random() * 0xFFF);
  }

  boostPriority(newPrio) {
    if (newPrio > this.currentPriority) {
      this.currentPriority = newPrio;
      return true;
    }
    return false;
  }

  resetPriority() {
    this.currentPriority = this.basePriority;
  }
}

class RtosMutex {
  constructor(name, usePriorityInheritance = true) {
    this.name = name;
    this.type = 'MUTEX';
    this.state = 'UNLOCKED'; // UNLOCKED, LOCKED
    this.owner = null; // TCB of current lock holder (STRICT OWNERSHIP)
    this.blockedQueue = []; // TCBs waiting for this mutex
    this.usePriorityInheritance = usePriorityInheritance;
  }

  lock(task, kernel) {
    if (this.state === 'UNLOCKED') {
      this.state = 'LOCKED';
      this.owner = task;
      task.acquiredResources.push(this.name);
      kernel.log(`[MUTEX] Task <span class="term-tag-ok">${task.name}</span> acquired Mutex <span class="term-tag-mutex">${this.name}</span>. Lock granted.`);
      return { success: true, blocked: false };
    }

    if (this.owner === task) {
      kernel.log(`[MUTEX WARN] Task <span class="term-tag-warn">${task.name}</span> already owns Mutex <span class="term-tag-mutex">${this.name}</span> (Recursive lock avoided).`);
      return { success: true, blocked: false };
    }

    // Mutex is already locked by another task!
    kernel.log(`[MUTEX CONTENTION] Task <span class="term-tag-err">${task.name}</span> (Prio ${task.currentPriority}) requested Mutex <span class="term-tag-mutex">${this.name}</span>, but it is LOCKED by <span class="term-tag-warn">${this.owner.name}</span> (Prio ${this.owner.currentPriority}).`);

    // Priority Inheritance Protocol (PIP) Check
    if (this.usePriorityInheritance && task.currentPriority > this.owner.currentPriority) {
      const oldPrio = this.owner.currentPriority;
      this.owner.boostPriority(task.currentPriority);
      kernel.log(`[PRIORITY INHERITANCE] RTOS Kernel elevated <span class="term-tag-warn">${this.owner.name}</span>'s priority: ${oldPrio} &rarr; <span class="term-tag-ok">${this.owner.currentPriority}</span> to prevent Unbounded Priority Inversion!`);
      if (window.rtosAudio) window.rtosAudio.playPriorityBoost();
    }

    // Move task to BLOCKED state
    task.state = 'BLOCKED';
    task.blockedOn = `Mutex: ${this.name}`;
    this.blockedQueue.push(task);
    if (window.rtosAudio) window.rtosAudio.playBlocked();

    kernel.log(`[SCHEDULER] Task <span class="term-tag-err">${task.name}</span> moved to BLOCKED queue of Mutex <span class="term-tag-mutex">${this.name}</span>.`);
    kernel.schedule();
    return { success: false, blocked: true };
  }

  unlock(task, kernel) {
    if (this.state === 'UNLOCKED') {
      kernel.log(`[MUTEX ERROR] Unlock failed: Mutex <span class="term-tag-mutex">${this.name}</span> is already UNLOCKED.`, 'err');
      return { success: false, reason: 'ALREADY_UNLOCKED' };
    }

    // STRICT OWNERSHIP ENFORCEMENT
    if (this.owner !== task) {
      kernel.log(`[MUTEX VIOLATION] SECURITY / RTOS PANIC: Task <span class="term-tag-err">${task.name}</span> attempted to unlock Mutex <span class="term-tag-mutex">${this.name}</span>, but Mutex is OWNED by <span class="term-tag-warn">${this.owner.name}</span>! Only the locking task can release a Mutex.`, 'err');
      if (window.rtosAudio) window.rtosAudio.playBlocked();
      return { success: false, reason: 'NOT_OWNER' };
    }

    // Task legitimately releases the mutex
    kernel.log(`[MUTEX] Task <span class="term-tag-ok">${task.name}</span> released Mutex <span class="term-tag-mutex">${this.name}</span>.`);
    
    // Remove from task's held resources
    task.acquiredResources = task.acquiredResources.filter(r => r !== this.name);

    // Restore priority if elevated
    if (task.currentPriority !== task.basePriority) {
      kernel.log(`[PRIORITY INHERITANCE] Restoring <span class="term-tag-ok">${task.name}</span>'s priority back to base level ${task.basePriority}.`);
      task.resetPriority();
    }

    if (this.blockedQueue.length > 0) {
      // Sort blocked queue by task currentPriority (highest first)
      this.blockedQueue.sort((a, b) => b.currentPriority - a.currentPriority);
      const nextTask = this.blockedQueue.shift();

      this.owner = nextTask;
      nextTask.state = 'READY';
      nextTask.blockedOn = null;
      nextTask.acquiredResources.push(this.name);
      kernel.readyQueue.push(nextTask);

      kernel.log(`[MUTEX HANDOFF] Mutex <span class="term-tag-mutex">${this.name}</span> immediately handed to highest priority waiting task: <span class="term-tag-ok">${nextTask.name}</span> (Prio ${nextTask.currentPriority}).`);
      if (window.rtosAudio) window.rtosAudio.playGranted();
    } else {
      this.state = 'UNLOCKED';
      this.owner = null;
    }

    kernel.schedule();
    return { success: true };
  }
}

class RtosSemaphore {
  constructor(name, initialCount = 1, maxCount = 1, isBinary = true) {
    this.name = name;
    this.type = isBinary ? 'BINARY_SEMAPHORE' : 'COUNTING_SEMAPHORE';
    this.isBinary = isBinary;
    this.count = initialCount;
    this.initialCount = initialCount;
    this.maxCount = maxCount;
    this.blockedQueue = []; // Tasks waiting for a token (Pend / wait)
  }

  // P() / wait() / OSSemPend() / xSemaphoreTake()
  take(task, kernel) {
    if (this.count > 0) {
      this.count--;
      kernel.log(`[SEMAPHORE P / TAKE] Task <span class="term-tag-ok">${task.name}</span> took token from <span class="term-tag-sem">${this.name}</span>. (Remaining tokens: ${this.count}/${this.maxCount})`);
      if (window.rtosAudio) window.rtosAudio.playGranted();
      return { success: true, blocked: false };
    }

    // No tokens available! Task must block.
    kernel.log(`[SEMAPHORE EXHAUSTED] Task <span class="term-tag-err">${task.name}</span> tried to take token from <span class="term-tag-sem">${this.name}</span>, but count is 0. Task enters BLOCKED queue.`);
    task.state = 'BLOCKED';
    task.blockedOn = `Semaphore: ${this.name}`;
    this.blockedQueue.push(task);
    if (window.rtosAudio) window.rtosAudio.playBlocked();

    kernel.schedule();
    return { success: false, blocked: true };
  }

  // V() / signal() / OSSemPost() / xSemaphoreGive()
  // NOTE: Semaphores have NO OWNERSHIP! Any task OR Interrupt Service Routine (ISR) can give/post!
  give(signalerName, kernel, isISR = false) {
    const signalerTag = isISR ? `<span class="term-tag-isr">[HARDWARE ISR]</span>` : `<span class="term-tag-ok">${signalerName}</span>`;

    if (this.blockedQueue.length > 0) {
      // Sort blocked queue by priority
      this.blockedQueue.sort((a, b) => b.currentPriority - a.currentPriority);
      const unblockedTask = this.blockedQueue.shift();

      unblockedTask.state = 'READY';
      unblockedTask.blockedOn = null;
      kernel.readyQueue.push(unblockedTask);

      kernel.log(`[SEMAPHORE V / SIGNAL] ${signalerTag} signaled <span class="term-tag-sem">${this.name}</span>. Unblocked waiting task <span class="term-tag-ok">${unblockedTask.name}</span> (Prio ${unblockedTask.currentPriority}) &rarr; moved to READY list.`);
      if (isISR && window.rtosAudio) {
        window.rtosAudio.playIsrAlarm();
      } else if (window.rtosAudio) {
        window.rtosAudio.playGranted();
      }
    } else {
      if (this.count < this.maxCount) {
        this.count++;
        kernel.log(`[SEMAPHORE V / SIGNAL] ${signalerTag} posted to <span class="term-tag-sem">${this.name}</span>. Count incremented: <span class="term-tag-ok">${this.count}/${this.maxCount}</span>.`);
        if (window.rtosAudio) window.rtosAudio.playGranted();
      } else {
        kernel.log(`[SEMAPHORE WARN] ${signalerTag} signaled <span class="term-tag-sem">${this.name}</span>, but count is already at maximum (${this.maxCount}). Signal absorbed.`);
      }
    }

    kernel.schedule();
    return { success: true };
  }
}

class RtosKernel {
  constructor() {
    this.tickCount = 0;
    this.tasks = new Map();
    this.readyQueue = [];
    this.runningTask = null;
    this.resources = new Map(); // Mutexes and Semaphores
    this.activePrimitive = null; // Primitive currently highlighted in the HUD
    this.analogyMode = 'mutex'; // 'mutex', 'binary_sem', 'counting_sem', 'kernel'
    this.eventListeners = [];

    this.initDefaultSystem();
  }

  initDefaultSystem() {
    this.tasks.clear();
    this.readyQueue = [];
    this.runningTask = null;
    this.resources.clear();

    // Default Mutex
    const mtx = new RtosMutex('MUTEX_SPI_BUS', true);
    this.resources.set(mtx.name, mtx);

    // Default Binary Semaphore (Task Sync & ISR Signaling)
    const binSem = new RtosSemaphore('SEM_SENSOR_DATA_READY', 0, 1, true);
    this.resources.set(binSem.name, binSem);

    // Default Counting Semaphore (Pool of 3 DMA Buffers or Sockets)
    const countSem = new RtosSemaphore('SEM_DMA_BUFFERS', 3, 3, false);
    this.resources.set(countSem.name, countSem);

    // Default Initial RTOS Tasks
    this.createTask('Task_High', 8, '0x20001000');
    this.createTask('Task_Medium', 5, '0x20001400');
    this.createTask('Task_Low', 2, '0x20001800');

    this.activePrimitive = mtx;
    this.schedule();
  }

  createTask(name, priority, stackPointer) {
    const id = `TCB_${name.toUpperCase()}`;
    const task = new TaskControlBlock(id, name, priority, stackPointer);
    this.tasks.set(name, task);
    this.readyQueue.push(task);
    return task;
  }

  // Preemptive Priority-Based RTOS Scheduler
  schedule() {
    this.tickCount += 10; // Simulated tick advance (10ms tick)

    // Sort ready queue by currentPriority descending
    this.readyQueue.sort((a, b) => b.currentPriority - a.currentPriority);

    const highestReady = this.readyQueue[0] || null;

    if (!this.runningTask) {
      if (highestReady) {
        this.readyQueue.shift();
        this.runningTask = highestReady;
        this.runningTask.state = 'RUNNING';
        this.log(`[SCHEDULER] CPU dispatched: <span class="term-tag-ok">${this.runningTask.name}</span> (Prio ${this.runningTask.currentPriority}) is now RUNNING.`);
      }
    } else {
      // If currently running task was blocked, dispatch next ready
      if (this.runningTask.state === 'BLOCKED') {
        const prevTask = this.runningTask;
        if (highestReady) {
          this.readyQueue.shift();
          this.runningTask = highestReady;
          this.runningTask.state = 'RUNNING';
          this.triggerContextSwitch(prevTask, this.runningTask);
        } else {
          this.runningTask = null;
          this.log(`[SCHEDULER] All application tasks BLOCKED. CPU switched to <span class="term-tag-sched">[IDLE TASK]</span>.`);
        }
      } else if (highestReady && highestReady.currentPriority > this.runningTask.currentPriority) {
        // Preemption condition!
        const prevTask = this.runningTask;
        prevTask.state = 'READY';
        this.readyQueue.push(prevTask);
        this.readyQueue.sort((a, b) => b.currentPriority - a.currentPriority);

        this.readyQueue.shift();
        this.runningTask = highestReady;
        this.runningTask.state = 'RUNNING';

        this.log(`[PREEMPTION] Higher priority task <span class="term-tag-ok">${this.runningTask.name}</span> (Prio ${this.runningTask.currentPriority}) preempted <span class="term-tag-warn">${prevTask.name}</span> (Prio ${prevTask.currentPriority})!`);
        this.triggerContextSwitch(prevTask, this.runningTask);
      }
    }

    this.notifyState();
  }

  triggerContextSwitch(fromTask, toTask) {
    if (fromTask) {
      fromTask.programCounter += 4;
    }
    this.log(`[CONTEXT SWITCH] Saving context: <span class="term-tag-sched">${fromTask ? fromTask.name : 'IDLE'}</span> (SP: ${fromTask ? fromTask.stackPointer : '0x0'}) &rarr; Restoring context: <span class="term-tag-sched">${toTask.name}</span> (SP: ${toTask.stackPointer}).`);
  }

  log(msg, type = 'info') {
    if (window.rtosTerminal) {
      window.rtosTerminal.printLine(msg, type);
    }
  }

  notifyState() {
    const snapshot = {
      tick: this.tickCount,
      runningTask: this.runningTask,
      readyQueue: [...this.readyQueue],
      tasks: Array.from(this.tasks.values()),
      resources: Array.from(this.resources.values()),
      activePrimitive: this.activePrimitive,
      analogyMode: this.analogyMode
    };

    this.eventListeners.forEach(listener => listener(snapshot));
  }

  onStateChange(fn) {
    this.eventListeners.push(fn);
  }
}

window.rtosKernel = new RtosKernel();
