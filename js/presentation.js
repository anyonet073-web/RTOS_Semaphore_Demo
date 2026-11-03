/* ==========================================================================
   RTOS-CoreTerm: Presentation Engine & Flipped Classroom Activity Manager
   Handles Guided Topics 1-5, Auto-Demo sequence, and Interactive Quiz
   ========================================================================== */

class RtosPresentation {
  constructor() {
    this.currentTopic = 1;
    this.speakerNotesText = document.getElementById('speaker-notes-text');
    this.quizModal = document.getElementById('quiz-modal');
    this.quizBody = document.getElementById('quiz-body');

    this.topicsData = {
      1: {
        title: 'TOPIC 1: Mutex (Mutual Exclusion Object)',
        speakerScript: `
          <b>What to say to class:</b> "Good morning professor and classmates. A Mutex is a locking mechanism designed strictly for mutual exclusion. The most critical concept is <b>STRICT OWNERSHIP</b>: whichever task locks a Mutex is the ONLY task permitted to unlock it. Furthermore, in RTOS, Mutexes feature <b>Priority Inheritance Protocol</b> to solve the deadly Priority Inversion bug."
        `,
        setup: async () => {
          const kernel = window.rtosKernel;
          const term = window.rtosTerminal;
          kernel.initDefaultSystem();
          const mtx = kernel.resources.get('MUTEX_SPI_BUS');
          kernel.activePrimitive = mtx;
          kernel.analogyMode = 'mutex';
          kernel.notifyState();

          term.clear();
          term.printBox('🔐 TOPIC 1: Working of the Mutex (Mutual Exclusion)', `
            <div style="font-size:0.85rem; line-height:1.6;">
              <b>1. Definition:</b> A Mutex (Mutual Exclusion) is a binary flag (0 or 1) that guarantees only ONE thread accesses a critical section at any given time.<br/>
              <b>2. The Golden Rule of Mutex:</b> <span class="term-tag-ok">STRICT OWNERSHIP</span>. Only the task that acquired the mutex can release it.<br/>
              <b>3. RTOS Specialty:</b> Mutexes support <b>Priority Inheritance Protocol (PIP)</b> to avoid unbounded Priority Inversion.<br/>
              <b>4. Real-World Metaphor:</b> Airplane lavatory key. The person inside locks it; no one outside can unlock it!
            </div>
          `);

          term.printLine(`<span class="term-tag-kernel">[DEMO]</span> Let's demonstrate Mutex ownership and contention:`);
          await term.typeAndRun('lock Task_Low', 1200);
          term.printLine(`<span class="term-tag-ok">[STATE]</span> Task_Low locked MUTEX_SPI_BUS. Now let's see what happens if Task_High attempts an illegal unlock!`);
          await term.typeAndRun('unlock Task_High', 1500);
          term.printLine(`<span class="term-tag-err">[BLOCKED TEST]</span> Now Task_High requests the locked mutex:`);
          await term.typeAndRun('lock Task_High', 1500);
          term.printLine(`<span class="term-tag-sched">[NOTICE]</span> Task_High is now BLOCKED in the wait queue, and Task_Low was boosted to Priority 8 via Priority Inheritance!`);
        }
      },
      2: {
        title: 'TOPIC 2: Semaphore & Dijkstra\'s Primitives',
        speakerScript: `
          <b>What to say to class:</b> "Next, we have the Semaphore, conceived by Edsger Dijkstra in 1965. Unlike a Mutex, a Semaphore is a <b>SIGNALING</b> mechanism, not a lock. It consists of an integer counter and a wait queue, manipulated via two atomic operations: wait() or P(), and signal() or V(). Crucially, semaphores have <b>NO OWNERSHIP</b>: any task or interrupt service routine can post to a semaphore!"
        `,
        setup: async () => {
          const kernel = window.rtosKernel;
          const term = window.rtosTerminal;
          kernel.initDefaultSystem();
          const sem = kernel.resources.get('SEM_SENSOR_DATA_READY');
          kernel.activePrimitive = sem;
          kernel.analogyMode = 'binary_sem';
          kernel.notifyState();

          term.clear();
          term.printBox('🚥 TOPIC 2: Working of the Semaphore', `
            <div style="font-size:0.85rem; line-height:1.6;">
              <b>1. Origin:</b> Conceived by Edsger Dijkstra in 1965.<br/>
              <b>2. Mathematical Structure:</b> A semaphore <code>S</code> is an integer variable accessed ONLY through two standard atomic system calls:<br/>
              &nbsp;&bull; <b>wait(S)</b> / <b>P(S)</b> (from Dutch <i>proberen</i> = to test/decrement):<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<code>while (S <= 0) block_task(); S--;</code><br/>
              &nbsp;&bull; <b>signal(S)</b> / <b>V(S)</b> (from Dutch <i>verhogen</i> = to increment):<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<code>if (blocked_queue_not_empty) unblock_task(); else S++;</code><br/>
              <b>3. No Ownership:</b> A semaphore does not belong to any thread. Thread A can wait(), and Thread B (or an ISR!) can signal()!
            </div>
          `);

          term.printLine(`<span class="term-tag-sem">[DEMO]</span> Let's demonstrate Task Synchronization via signaling:`);
          await term.typeAndRun('take Task_High', 1200);
          term.printLine(`<span class="term-tag-warn">[WAITING]</span> Task_High is now suspended waiting for an event signal.`);
          await term.typeAndRun('give Task_Low', 1400);
          term.printLine(`<span class="term-tag-ok">[UNBLOCKED]</span> Task_Low signaled the semaphore! Task_High immediately awakened and preempted CPU.`);
        }
      },
      3: {
        title: 'TOPIC 3: Types of Semaphore (Binary vs Counting)',
        speakerScript: `
          <b>What to say to class:</b> "Semaphores come in two primary types: <b>Binary Semaphores</b>, where the counter can only be 0 or 1, and <b>Counting Semaphores</b>, where the counter can be any non-negative integer N. Binary semaphores are primarily used for event synchronization and interrupt handling. Counting semaphores are used to manage a pool of identical resources, such as 3 DMA buffers or 5 network sockets."
        `,
        setup: async () => {
          const kernel = window.rtosKernel;
          const term = window.rtosTerminal;
          kernel.initDefaultSystem();
          const countSem = kernel.resources.get('SEM_DMA_BUFFERS');
          kernel.activePrimitive = countSem;
          kernel.analogyMode = 'counting_sem';
          kernel.notifyState();

          term.clear();
          term.printBox('🔢 TOPIC 3: Types of Semaphore (Binary vs Counting)', `
            <div style="font-size:0.85rem; line-height:1.6;">
              <table class="term-table">
                <tr><th>Aspect</th><th>Binary Semaphore</th><th>Counting Semaphore</th></tr>
                <tr><td><b>Counter Range</b></td><td>Only 0 or 1</td><td>0 to N (Arbitrary positive integer)</td></tr>
                <tr><td><b>Primary Purpose</b></td><td>Signaling, Event notification, Task-to-Task sync</td><td>Managing a pool of identical shared resources</td></tr>
                <tr><td><b>Initial Value</b></td><td>Typically 0 (to wait for an event) or 1</td><td>Initial count = Number of available resource slots (e.g., 3)</td></tr>
                <tr><td><b>Example in RTOS</b></td><td>UART Rx character received, ADC conversion complete</td><td>3 DMA channels, 4 memory partitions, 5 connection sockets</td></tr>
              </table>
            </div>
          `);

          term.printLine(`<span class="term-tag-sem">[DEMO]</span> Let's test the Counting Semaphore (SEM_DMA_BUFFERS with 3 slots):`);
          await term.typeAndRun('take Task_High', 900);
          await term.typeAndRun('take Task_Medium', 900);
          await term.typeAndRun('take Task_Low', 900);
          term.printLine(`<span class="term-tag-warn">[EXHAUSTED]</span> All 3 tokens are taken. Counter S = 0. Watch what happens when another task requests a slot!`);
          await term.typeAndRun('spawn Task_Printer 6', 1000);
          await term.typeAndRun('take Task_Printer', 1400);
          term.printLine(`<span class="term-tag-err">[BLOCKED]</span> Task_Printer is blocked! Now let's release one token:`);
          await term.typeAndRun('give Task_High', 1200);
          term.printLine(`<span class="term-tag-ok">[AWAKENED]</span> Task_Printer immediately unblocked and grabbed the released token!`);
        }
      },
      4: {
        title: 'TOPIC 4: Purpose of Semaphore in Operating Systems',
        speakerScript: `
          <b>What to say to class:</b> "What is the true purpose of a Semaphore? There are four major purposes: First, <b>Mutual Exclusion</b> to protect critical shared hardware. Second, <b>Task Synchronization</b> to allow threads to coordinate execution order. Third, <b>Deferred Interrupt Handling</b>, where an ultra-fast hardware ISR signals a semaphore to wake up an RTOS worker task without freezing the CPU. And fourth, <b>Producer-Consumer Flow Control</b> for bounded buffers."
        `,
        setup: async () => {
          const kernel = window.rtosKernel;
          const term = window.rtosTerminal;
          kernel.initDefaultSystem();
          kernel.analogyMode = 'binary_sem';
          kernel.activePrimitive = kernel.resources.get('SEM_SENSOR_DATA_READY');
          kernel.notifyState();

          term.clear();
          term.printBox('🎯 TOPIC 4: Purpose of Semaphore in RTOS & Operating Systems', `
            <div style="font-size:0.85rem; line-height:1.6;">
              Operating systems deploy semaphores for 4 vital coordination purposes:
              <ol style="margin-left:20px; margin-top:8px;">
                <li><b>Mutual Exclusion (Resource Protection):</b> Preventing simultaneous writes to shared memory or I/O buses.</li>
                <li><b>Task Synchronization (Handshaking / Rendezvous):</b> Task B cannot compute until Task A finishes reading sensor data.</li>
                <li><b>ISR to Task Signaling (Deferred Interrupt Processing):</b>
                  In an RTOS, Interrupt Service Routines (ISRs) must execute in microseconds! Instead of processing heavy data inside the ISR, the ISR simply clears the hardware flag, calls <code>xSemaphoreGiveFromISR()</code>, and exits! The kernel immediately wakes the worker task.
                </li>
                <li><b>Bounded Buffer / Flow Control:</b> Regulating producers and consumers to avoid buffer overflow or underflow.</li>
              </ol>
            </div>
          `);

          term.printLine(`<span class="term-tag-isr">[LIVE DEMO: ISR SIGNALING]</span> Watch an actual hardware interrupt unblock real-time processing:`);
          await term.typeAndRun('take Task_High', 1000);
          term.printLine(`<span class="term-tag-warn">[TASK SLEEPING]</span> Task_High is sleeping waiting for Hardware Sensor IRQ...`);
          await term.typeAndRun('isr', 1500);
          term.printLine(`<span class="term-tag-ok">[SUCCESS]</span> ISR fired, signaled semaphore, and RTOS preemptively restored Task_High to RUNNING!`);
        }
      },
      5: {
        title: 'TOPIC 5: How the Operating System / RTOS Kernel Uses It',
        speakerScript: `
          <b>What to say to class:</b> "Finally, how does the OS kernel actually implement this under the hood? It coordinates processes using three core structures: The <b>Task Control Block (TCB)</b>, the <b>Semaphore Control Block (SCB)</b> containing the waiting queue, and the <b>Preemptive Scheduler</b>. When a task calls wait() and the count is 0, the OS disables interrupts atomically, moves the task TCB to the Semaphore's Blocked List, and performs a <b>Context Switch</b>: saving CPU registers to the stack and loading the next ready task!"
        `,
        setup: async () => {
          const kernel = window.rtosKernel;
          const term = window.rtosTerminal;
          kernel.initDefaultSystem();
          kernel.analogyMode = 'kernel';
          kernel.notifyState();

          term.clear();
          term.printBox('⚙️ TOPIC 5: How the Operating System / Kernel Uses Semaphores', `
            <div style="font-size:0.85rem; line-height:1.6;">
              <b>1. Task Control Block (TCB) & State Engine:</b><br/>
              Every thread is represented by a TCB in memory (CPU registers, stack pointer, priority, and state: <code>READY &harr; RUNNING &harr; BLOCKED</code>).<br/><br/>
              <b>2. Semaphore Control Block (SCB):</b><br/>
              <code>struct SCB { int count; TCB_t *wait_queue_head; uint8_t max_count; };</code><br/><br/>
              <b>3. Atomic Kernel Protection:</b><br/>
              When executing <code>wait()</code> or <code>signal()</code>, the kernel disables hardware interrupts or takes an internal spinlock to ensure count decrement and queue manipulation are 100% indivisible (atomic).<br/><br/>
              <b>4. Context Switching Mechanism:</b><br/>
              When a task is blocked, the CPU triggers a <b>PendSV / Trap exception</b>, saves registers R0-R15 and PSR onto the current task stack, updates the Stack Pointer in its TCB, and loads the register state of the highest priority ready task!
            </div>
          `);

          term.printLine(`<span class="term-tag-sched">[DEMO]</span> Let's inspect live TCB context switches and queue transitions:`);
          await term.typeAndRun('pip-demo', 2000);
        }
      }
    };

    this.quizQuestions = [
      {
        question: "1. Can Task B unlock a Mutex that was acquired by Task A?",
        options: [
          "A. Yes, any thread can unlock any synchronization primitive.",
          "B. No! A Mutex enforces STRICT OWNERSHIP; only the locking task can release it.",
          "C. Yes, but only if Task B has higher priority than Task A.",
          "D. Only if the operating system is in kernel mode."
        ],
        correct: 1,
        explanation: "Correct! Mutexes require strict ownership. An attempt by another thread to unlock generates an illegal violation or RTOS panic."
      },
      {
        question: "2. Can a Hardware Interrupt Service Routine (ISR) signal a Semaphore?",
        options: [
          "A. No, ISRs cannot interact with RTOS primitives under any circumstances.",
          "B. Yes! Semaphores have NO OWNERSHIP, making them ideal for ISR-to-Task notification.",
          "C. Only if the Semaphore is a Mutex.",
          "D. Yes, but only after executing a context switch inside the ISR."
        ],
        correct: 1,
        explanation: "Correct! Semaphores do not track ownership, allowing ISRs to call functions like xSemaphoreGiveFromISR() to wake worker threads."
      },
      {
        question: "3. If a system has 4 identical serial ports, what synchronization primitive should be used to manage access?",
        options: [
          "A. A single Mutex.",
          "B. A Binary Semaphore with initial value 1.",
          "C. A Counting Semaphore with initial value 4.",
          "D. An RTOS Spinlock."
        ],
        correct: 2,
        explanation: "Correct! A Counting Semaphore initialized to N (here 4) tracks availability of multiple identical shared resource instances."
      },
      {
        question: "4. What dangerous RTOS scheduling bug occurs when a medium-priority task delays a high-priority task waiting on a low-priority task?",
        options: [
          "A. Race Condition",
          "B. Priority Inversion (solved by Priority Inheritance Protocol)",
          "C. Starvation Deadlock",
          "D. Buffer Overflow"
        ],
        correct: 1,
        explanation: "Correct! Priority Inversion famously afflicted the 1997 Mars Pathfinder spacecraft, which was resolved using Priority Inheritance."
      },
      {
        question: "5. When a thread calls wait() on a semaphore with counter = 0, what does the OS do?",
        options: [
          "A. Busy-waits in an infinite while-loop burning CPU cycles.",
          "B. Moves the thread's TCB to the Semaphore's BLOCKED list and triggers a Context Switch.",
          "C. Terminates the thread with a segmentation fault.",
          "D. Resets the semaphore counter to 1."
        ],
        correct: 1,
        explanation: "Correct! To prevent CPU waste, the RTOS kernel transitions the thread from RUNNING to BLOCKED and dispatches another ready task."
      }
    ];

    this.setupTopicNav();
  }

  setupTopicNav() {
    const navButtons = document.querySelectorAll('.nav-btn[data-topic]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-topic');
        this.loadTopic(t);
      });
    });

    const autoDemoBtn = document.getElementById('auto-demo-btn');
    if (autoDemoBtn) {
      autoDemoBtn.addEventListener('click', () => {
        this.runFullPresentation();
      });
    }

    const quizBtn = document.getElementById('quiz-btn');
    if (quizBtn) {
      quizBtn.addEventListener('click', () => {
        this.openQuizModal();
      });
    }
  }

  async loadTopic(topicNum) {
    const num = parseInt(topicNum, 10);
    if (!this.topicsData[num]) return;

    this.currentTopic = num;

    // Update active nav button
    document.querySelectorAll('.nav-btn[data-topic]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-topic') === String(num));
    });

    // Update Speaker Notes banner
    if (this.speakerNotesText) {
      this.speakerNotesText.innerHTML = this.topicsData[num].speakerScript;
    }

    // Execute topic presentation setup
    await this.topicsData[num].setup();
  }

  async runFullPresentation() {
    const term = window.rtosTerminal;
    term.clear();
    term.printBox('🎬 STARTING AUTONOMOUS CLASSROOM DEMONSTRATION', `
      <div style="font-size:0.85rem; color:var(--text-main);">
        Presenting all 5 topics required for the Flipped Classroom Activity:<br/>
        1. Mutex &nbsp;|&nbsp; 2. Semaphore &nbsp;|&nbsp; 3. Types &nbsp;|&nbsp; 4. Purpose &nbsp;|&nbsp; 5. OS Kernel Mechanics
      </div>
    `);

    for (let i = 1; i <= 5; i++) {
      await this.loadTopic(i);
      // Wait between topics during autonomous presentation
      await new Promise(r => setTimeout(r, 4500));
    }

    term.printBox('🏁 DEMONSTRATION COMPLETE', `
      <div style="font-size:0.85rem; color:var(--neon-green);">
        All 5 topics successfully demonstrated! You can now invite classmates to take the <b>Interactive Flipped Classroom Quiz</b> by clicking the Quiz button.
      </div>
    `);
  }

  openQuizModal() {
    if (!this.quizModal || !this.quizBody) return;

    this.quizBody.innerHTML = '';
    let currentScore = 0;

    this.quizQuestions.forEach((q, idx) => {
      const qBox = document.createElement('div');
      qBox.className = 'quiz-question-box';

      qBox.innerHTML = `
        <div class="quiz-q-num">Question ${idx + 1} of ${this.quizQuestions.length}</div>
        <div class="quiz-q-text">${q.question}</div>
        <div class="quiz-options" id="quiz-options-${idx}">
          ${q.options.map((opt, optIdx) => `
            <button class="quiz-option-btn" data-q="${idx}" data-opt="${optIdx}">
              ${opt}
            </button>
          `).join('')}
        </div>
        <div class="quiz-feedback" id="quiz-feedback-${idx}"></div>
      `;

      this.quizBody.appendChild(qBox);
    });

    // Add option click event listeners
    this.quizBody.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qIdx = parseInt(btn.getAttribute('data-q'), 10);
        const optIdx = parseInt(btn.getAttribute('data-opt'), 10);
        const qData = this.quizQuestions[qIdx];
        const optionsContainer = document.getElementById(`quiz-options-${qIdx}`);
        const feedbackBox = document.getElementById(`quiz-feedback-${qIdx}`);

        // Disable all buttons in this question
        optionsContainer.querySelectorAll('.quiz-option-btn').forEach(b => b.style.pointerEvents = 'none');

        if (optIdx === qData.correct) {
          btn.classList.add('correct');
          feedbackBox.className = 'quiz-feedback show correct-feedback';
          feedbackBox.innerHTML = `<b>🎉 Correct!</b> ${qData.explanation}`;
          if (window.rtosAudio) window.rtosAudio.playQuizSuccess();
        } else {
          btn.classList.add('incorrect');
          const correctBtn = optionsContainer.querySelector(`[data-opt="${qData.correct}"]`);
          if (correctBtn) correctBtn.classList.add('correct');
          feedbackBox.className = 'quiz-feedback show incorrect-feedback';
          feedbackBox.innerHTML = `<b>❌ Incorrect!</b> ${qData.explanation}`;
          if (window.rtosAudio) window.rtosAudio.playBlocked();
        }
      });
    });

    this.quizModal.classList.add('open');
  }

  closeQuizModal() {
    if (this.quizModal) {
      this.quizModal.classList.remove('open');
    }
  }
}

window.rtosPresentation = new RtosPresentation();
