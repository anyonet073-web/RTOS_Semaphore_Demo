/* ==========================================================================
   RTOS-CoreTerm: Interactive Terminal CLI Engine
   Implements Shell Parser, Command History, Tab Auto-Complete,
   Colored Formatted Logs, and Presentation Demonstrations
   ========================================================================== */

class RtosTerminal {
  constructor(containerId, inputId) {
    this.container = document.getElementById(containerId);
    this.input = document.getElementById(inputId);
    this.history = [];
    this.historyIndex = -1;
    this.isAutoTyping = false;

    this.commandsList = [
      'help', 'topic 1', 'topic 2', 'topic 3', 'topic 4', 'topic 5',
      'mutex', 'sem', 'types', 'purpose', 'os-kernel',
      'lock', 'unlock', 'take', 'give', 'isr',
      'select', 'spawn', 'compare', 'pip-demo', 'mailbox',
      'auto-demo', 'quiz', 'clear', 'reset', 'theme', 'sound'
    ];

    this.setupListeners();
  }

  setupListeners() {
    if (!this.input) return;

    this.input.addEventListener('keydown', (e) => {
      if (window.rtosAudio) window.rtosAudio.playKeypress();

      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = this.input.value.trim();
        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          this.printPrompt(cmd);
          this.execute(cmd);
          this.input.value = '';
          if (window.rtosAudio) window.rtosAudio.playCommandEnter();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.input.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabComplete();
      }
    });

    // Keep focus on terminal when clicking on terminal body
    if (this.container) {
      this.container.addEventListener('click', () => {
        this.input.focus();
      });
    }
  }

  handleTabComplete() {
    const val = this.input.value.toLowerCase().trim();
    if (!val) return;
    const match = this.commandsList.find(c => c.startsWith(val));
    if (match) {
      this.input.value = match;
    }
  }

  printPrompt(cmd) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = `<span class="term-prompt">rtos@kernel<span class="dir">:~$</span></span> <span style="color:#fff; font-weight:600;">${this.escapeHtml(cmd)}</span>`;
    this.container.appendChild(line);
    this.scrollToBottom();
  }

  printLine(htmlContent, type = 'info') {
    const line = document.createElement('div');
    line.className = `term-line ${type}`;
    line.innerHTML = htmlContent;
    this.container.appendChild(line);
    this.scrollToBottom();
  }

  printBox(title, content) {
    const box = document.createElement('div');
    box.className = 'term-box';
    box.innerHTML = `<div style="color:var(--neon-cyan); font-weight:700; margin-bottom:4px;">${title}</div><div>${content}</div>`;
    this.container.appendChild(box);
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Interactive Auto-Typing Simulation helper
  async typeAndRun(commandStr, delayAfter = 1200) {
    this.isAutoTyping = true;
    this.input.value = '';
    for (let i = 0; i < commandStr.length; i++) {
      this.input.value += commandStr[i];
      if (window.rtosAudio) window.rtosAudio.playKeypress();
      await new Promise(r => setTimeout(r, 35));
    }
    await new Promise(r => setTimeout(r, 200));
    this.printPrompt(commandStr);
    this.input.value = '';
    this.execute(commandStr);
    this.isAutoTyping = false;
    await new Promise(r => setTimeout(r, delayAfter));
  }

  // Command Dispatcher
  execute(cmdLine) {
    const parts = cmdLine.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1];
    const arg2 = parts[2];
    const kernel = window.rtosKernel;

    switch (cmd) {
      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'clear':
      case 'cls':
        this.clear();
        break;

      case 'reset':
        kernel.initDefaultSystem();
        this.printLine(`<span class="term-tag-ok">[SYSTEM RESET]</span> RTOS Kernel reinitialized to default state.`, 'ok');
        break;

      case 'topic':
        this.handleTopic(arg1);
        break;

      case 'mutex':
        this.handleTopic('1');
        break;

      case 'sem':
      case 'semaphore':
        this.handleTopic('2');
        break;

      case 'types':
        this.handleTopic('3');
        break;

      case 'purpose':
        this.handleTopic('4');
        break;

      case 'os-kernel':
      case 'os':
      case 'kernel':
        this.handleTopic('5');
        break;

      case 'select':
        this.handleSelect(arg1);
        break;

      case 'lock':
        this.handleLock(arg1);
        break;

      case 'unlock':
        this.handleUnlock(arg1);
        break;

      case 'take':
      case 'wait':
      case 'pend':
        this.handleTake(arg1);
        break;

      case 'give':
      case 'signal':
      case 'post':
        this.handleGive(arg1);
        break;

      case 'isr':
      case 'interrupt':
        this.handleISR();
        break;

      case 'spawn':
        this.handleSpawn(arg1, arg2);
        break;

      case 'compare':
        this.showComparisonTable();
        break;

      case 'pip-demo':
      case 'priority-inversion':
        this.runPriorityInversionDemo();
        break;

      case 'mailbox':
        this.showMailboxDemo();
        break;

      case 'quiz':
        if (window.rtosPresentation) {
          window.rtosPresentation.openQuizModal();
        }
        break;

      case 'auto-demo':
        if (window.rtosPresentation) {
          window.rtosPresentation.runFullPresentation();
        }
        break;

      case 'theme':
        this.handleTheme(arg1);
        break;

      case 'sound':
        if (window.rtosAudio) {
          const state = window.rtosAudio.toggleSound();
          this.printLine(`<span class="term-tag-ok">[AUDIO]</span> Synthesized Sound FX: <b>${state ? 'ENABLED' : 'MUTED'}</b>.`);
        }
        break;

      default:
        this.printLine(`<span class="term-tag-err">[UNKNOWN COMMAND]</span> '${cmd}'. Type <span class="term-tag-ok">help</span> to view available RTOS commands.`, 'err');
        break;
    }
  }

  showHelp() {
    this.printBox('⚡ RTOS-CoreTerm Interactive Command Manual', `
      <div style="margin-bottom:8px; color:var(--text-muted);">
        Interactive laboratory designed for presentation and demonstration of RTOS Synchronization.
      </div>
      <table class="term-table">
        <tr><th>Topic Presentations</th><th>Description</th></tr>
        <tr><td><span class="cmd-pill">topic 1</span> or <span class="cmd-pill">mutex</span></td><td>Working of Mutex, Ownership & Lock mechanism</td></tr>
        <tr><td><span class="cmd-pill">topic 2</span> or <span class="cmd-pill">sem</span></td><td>Working of Semaphore & Dijkstra's P/V atomic ops</td></tr>
        <tr><td><span class="cmd-pill">topic 3</span> or <span class="cmd-pill">types</span></td><td>Types of Semaphore (Binary vs Counting)</td></tr>
        <tr><td><span class="cmd-pill">topic 4</span> or <span class="cmd-pill">purpose</span></td><td>Purpose of Semaphore in RTOS & real-world cases</td></tr>
        <tr><td><span class="cmd-pill">topic 5</span> or <span class="cmd-pill">os-kernel</span></td><td>How Operating System uses it (TCBs, Queues, Scheduler)</td></tr>
        <tr><th>Live Simulations</th><th>Description</th></tr>
        <tr><td><span class="cmd-pill">lock &lt;task&gt;</span></td><td>Task locks active Mutex (e.g., <code>lock Task_Low</code>)</td></tr>
        <tr><td><span class="cmd-pill">unlock &lt;task&gt;</span></td><td>Task unlocks Mutex (tests strict ownership check)</td></tr>
        <tr><td><span class="cmd-pill">take &lt;task&gt;</span></td><td>Task acquires token (P/wait) from active Semaphore</td></tr>
        <tr><td><span class="cmd-pill">give [task|isr]</span></td><td>Signals/posts (V/signal) token to active Semaphore</td></tr>
        <tr><td><span class="cmd-pill">isr</span></td><td>Simulates Hardware Interrupt unblocking high-priority task</td></tr>
        <tr><td><span class="cmd-pill">pip-demo</span></td><td>Simulate Priority Inversion & Priority Inheritance Protocol</td></tr>
        <tr><td><span class="cmd-pill">compare</span></td><td>Comprehensive ASCII comparison matrix</td></tr>
        <tr><td><span class="cmd-pill">mailbox</span></td><td>RTOS Mailbox IPC & Semaphore interaction</td></tr>
        <tr><td><span class="cmd-pill">auto-demo</span></td><td>Play autonomous full presentation for the class!</td></tr>
        <tr><td><span class="cmd-pill">quiz</span></td><td>Open interactive Flipped Classroom activity quiz</td></tr>
        <tr><td><span class="cmd-pill">clear</span> / <span class="cmd-pill">reset</span></td><td>Clear terminal screen / Reset kernel state</td></tr>
      </table>
    `);
  }

  handleTopic(topicNum) {
    if (window.rtosPresentation) {
      window.rtosPresentation.loadTopic(topicNum);
    }
  }

  handleSelect(primitiveType) {
    const kernel = window.rtosKernel;
    if (!primitiveType) {
      this.printLine(`<span class="term-tag-warn">[USAGE]</span> select &lt;mutex | binary | counting&gt;`);
      return;
    }
    const type = primitiveType.toLowerCase();
    if (type.includes('mut')) {
      kernel.activePrimitive = kernel.resources.get('MUTEX_SPI_BUS');
      kernel.analogyMode = 'mutex';
      this.printLine(`<span class="term-tag-ok">[HUD ACTIVE]</span> Selected: <span class="term-tag-mutex">MUTEX_SPI_BUS</span> (Mutual Exclusion Object).`);
    } else if (type.includes('bin')) {
      kernel.activePrimitive = kernel.resources.get('SEM_SENSOR_DATA_READY');
      kernel.analogyMode = 'binary_sem';
      this.printLine(`<span class="term-tag-ok">[HUD ACTIVE]</span> Selected: <span class="term-tag-sem">SEM_SENSOR_DATA_READY</span> (Binary Semaphore).`);
    } else if (type.includes('count')) {
      kernel.activePrimitive = kernel.resources.get('SEM_DMA_BUFFERS');
      kernel.analogyMode = 'counting_sem';
      this.printLine(`<span class="term-tag-ok">[HUD ACTIVE]</span> Selected: <span class="term-tag-sem">SEM_DMA_BUFFERS</span> (Counting Semaphore with 3 slots).`);
    } else {
      this.printLine(`<span class="term-tag-err">[ERROR]</span> Invalid selection. Choose 'mutex', 'binary', or 'counting'.`);
    }
    kernel.notifyState();
  }

  handleLock(taskName) {
    const kernel = window.rtosKernel;
    const mtx = kernel.activePrimitive && kernel.activePrimitive.type === 'MUTEX' 
      ? kernel.activePrimitive 
      : kernel.resources.get('MUTEX_SPI_BUS');

    let task = null;
    if (taskName) {
      // Find matching task by substring
      task = Array.from(kernel.tasks.values()).find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
    } else {
      task = kernel.runningTask;
    }

    if (!task) {
      this.printLine(`<span class="term-tag-err">[ERROR]</span> Task not found. Specify a valid task name (e.g. <code>lock Task_High</code>).`);
      return;
    }

    mtx.lock(task, kernel);
  }

  handleUnlock(taskName) {
    const kernel = window.rtosKernel;
    const mtx = kernel.activePrimitive && kernel.activePrimitive.type === 'MUTEX' 
      ? kernel.activePrimitive 
      : kernel.resources.get('MUTEX_SPI_BUS');

    let task = null;
    if (taskName) {
      task = Array.from(kernel.tasks.values()).find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
    } else {
      task = kernel.runningTask;
    }

    if (!task) {
      this.printLine(`<span class="term-tag-err">[ERROR]</span> Task not found.`);
      return;
    }

    mtx.unlock(task, kernel);
  }

  handleTake(taskName) {
    const kernel = window.rtosKernel;
    let sem = kernel.activePrimitive;
    if (!sem || sem.type === 'MUTEX') {
      sem = kernel.resources.get('SEM_DMA_BUFFERS');
      kernel.activePrimitive = sem;
    }

    let task = null;
    if (taskName) {
      task = Array.from(kernel.tasks.values()).find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
    } else {
      task = kernel.runningTask;
    }

    if (!task) {
      this.printLine(`<span class="term-tag-err">[ERROR]</span> Task not found.`);
      return;
    }

    sem.take(task, kernel);
  }

  handleGive(signaler) {
    const kernel = window.rtosKernel;
    let sem = kernel.activePrimitive;
    if (!sem || sem.type === 'MUTEX') {
      sem = kernel.resources.get('SEM_DMA_BUFFERS');
      kernel.activePrimitive = sem;
    }

    const isISR = signaler && signaler.toLowerCase() === 'isr';
    const name = signaler ? signaler : (kernel.runningTask ? kernel.runningTask.name : 'System_Task');

    sem.give(name, kernel, isISR);
  }

  handleISR() {
    const kernel = window.rtosKernel;
    const binSem = kernel.resources.get('SEM_SENSOR_DATA_READY');
    kernel.activePrimitive = binSem;
    kernel.analogyMode = 'binary_sem';

    this.printLine(`<span class="term-tag-isr">⚡ [HARDWARE INTERRUPT (EXTI_IRQn)]</span> Hardware Sensor detected new data! ISR executed in 2.4 &mu;s.`);
    binSem.give('EXTI_Sensor_ISR', kernel, true);
  }

  handleSpawn(name, prioStr) {
    const kernel = window.rtosKernel;
    if (!name || !prioStr) {
      this.printLine(`<span class="term-tag-warn">[USAGE]</span> spawn &lt;TaskName&gt; &lt;Priority 1-10&gt;`);
      return;
    }
    const prio = parseInt(prioStr, 10);
    if (isNaN(prio) || prio < 1 || prio > 10) {
      this.printLine(`<span class="term-tag-err">[ERROR]</span> Priority must be an integer between 1 (low) and 10 (real-time high).`);
      return;
    }
    const sp = '0x2000' + (2000 + kernel.tasks.size * 0x400).toString(16);
    const task = kernel.createTask(name, prio, sp);
    this.printLine(`<span class="term-tag-ok">[TCB ALLOCATED]</span> Task <b>${task.name}</b> spawned with Priority <b>${prio}</b> at Stack: <b>${sp}</b>.`);
    kernel.schedule();
  }

  showComparisonTable() {
    this.printBox('📊 Comprehensive Comparison: Mutex vs Binary Semaphore vs Counting Semaphore', `
      <table class="term-table">
        <tr>
          <th>Feature</th>
          <th>Mutex (Mutual Exclusion)</th>
          <th>Binary Semaphore</th>
          <th>Counting Semaphore</th>
        </tr>
        <tr>
          <td><b>Core Mechanism</b></td>
          <td>Locking / Ownership Object</td>
          <td>Signaling Flag (0 or 1)</td>
          <td>Resource Counter (0 to N)</td>
        </tr>
        <tr>
          <td><b>Ownership Concept</b></td>
          <td><span class="term-tag-ok">YES</span> (Only owner can unlock)</td>
          <td><span class="term-tag-err">NO</span> (Any task/ISR can signal)</td>
          <td><span class="term-tag-err">NO</span> (Any task/ISR can signal)</td>
        </tr>
        <tr>
          <td><b>Priority Inheritance (PIP)</b></td>
          <td><span class="term-tag-ok">Supported</span> (Solves Inversion)</td>
          <td><span class="term-tag-err">Not Supported</span></td>
          <td><span class="term-tag-err">Not Supported</span></td>
        </tr>
        <tr>
          <td><b>Can ISR Signal?</b></td>
          <td><span class="term-tag-err">NO</span> (ISR cannot own mutex)</td>
          <td><span class="term-tag-ok">YES</span> (xSemaphoreGiveFromISR)</td>
          <td><span class="term-tag-ok">YES</span> (xSemaphoreGiveFromISR)</td>
        </tr>
        <tr>
          <td><b>Primary Use Case</b></td>
          <td>Protecting Critical Sections (Shared bus, memory, hardware)</td>
          <td>Event Notification & Task Synchronization</td>
          <td>Managing a Pool of Finite Identical Resources</td>
        </tr>
        <tr>
          <td><b>Real-Life Metaphor</b></td>
          <td>Bathroom key with locked door</td>
          <td>Traffic light / Railway green signal</td>
          <td>Car Parking Lot with N slots</td>
        </tr>
      </table>
    `);
  }

  async runPriorityInversionDemo() {
    this.printBox('🔥 Simulating Mars Pathfinder (1997) Priority Inversion Bug & Solution', `
      <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">
        Watch the RTOS kernel demonstrate Unbounded Priority Inversion and how <b>Priority Inheritance Protocol (PIP)</b> saves the system from deadlock!
      </div>
    `);

    const kernel = window.rtosKernel;
    kernel.initDefaultSystem();
    const mtx = kernel.resources.get('MUTEX_SPI_BUS');
    kernel.activePrimitive = mtx;
    kernel.analogyMode = 'mutex';

    await this.typeAndRun('lock Task_Low', 1200);
    this.printLine(`<span class="term-tag-mutex">[SCENARIO]</span> Task_Low (Prio 2) is now in the Critical Section holding the shared SPI Bus.`);

    await this.typeAndRun('lock Task_High', 1400);
    this.printLine(`<span class="term-tag-err">[CONTENTION]</span> Task_High (Prio 8) needs the SPI bus, but it is locked by Task_Low! Task_High is BLOCKED.`);
    this.printLine(`<span class="term-tag-ok">[PIP IN ACTION]</span> RTOS automatically boosted Task_Low's priority to 8 so medium priority tasks cannot delay it!`);

    await this.typeAndRun('spawn Task_MediumPreempt 5', 1400);
    this.printLine(`<span class="term-tag-sched">[SCHEDULER]</span> Task_MediumPreempt (Prio 5) wants to run. But because Task_Low was boosted to Priority 8, Medium CANNOT preempt it!`);

    await this.typeAndRun('unlock Task_Low', 1500);
    this.printLine(`<span class="term-tag-ok">[RESOLVED]</span> Task_Low finished critical section, unlocked Mutex. Task_High immediately woke up and preempted the CPU! System saved!`);
  }

  showMailboxDemo() {
    this.printBox('📬 RTOS Mailbox & Semaphore Integration', `
      <div style="font-size:0.82rem; line-height:1.6;">
        <b>How Mailboxes rely on Semaphores in RTOS:</b><br/>
        An RTOS <b>Mailbox</b> (or Message Queue) is an IPC (Inter-Process Communication) mechanism where tasks send data pointers or messages.<br/><br/>
        <b>Under the hood of the Kernel:</b>
        <ol style="margin-left:20px; margin-top:6px;">
          <li>A <b>Counting Semaphore (ItemsAvailable)</b> tracks how many unread messages are in the mailbox buffer.</li>
          <li>A <b>Counting Semaphore (SlotsFree)</b> tracks available free slots in the mailbox to prevent buffer overflow.</li>
          <li>A <b>Mutex</b> guards the message buffer array so two tasks don't overwrite the same memory slot simultaneously!</li>
        </ol>
        <div style="margin-top:8px; color:var(--neon-green);">
          &rarr; Semaphores coordinate the synchronization, while the Mailbox conveys the actual payload data!
        </div>
      </div>
    `);
  }

  handleTheme(themeName) {
    if (!themeName) {
      this.printLine(`<span class="term-tag-warn">[USAGE]</span> theme &lt;cyber | amber | matrix | slate&gt;`);
      return;
    }
    const body = document.body;
    body.classList.remove('theme-amber', 'theme-matrix', 'theme-slate');
    const t = themeName.toLowerCase();
    if (t === 'amber') body.classList.add('theme-amber');
    else if (t === 'matrix') body.classList.add('theme-matrix');
    else if (t === 'slate') body.classList.add('theme-slate');
    this.printLine(`<span class="term-tag-ok">[THEME]</span> Terminal visual theme switched to <b>${themeName.toUpperCase()}</b>.`);
  }
}

// Initialized on DOM ready in visualizer.js / index.html
