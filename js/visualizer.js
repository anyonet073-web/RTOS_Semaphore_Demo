/* ==========================================================================
   RTOS-CoreTerm: Real-Time HUD & Architecture Visualizer
   Renders CPU State, Task Queues, Resource Vault, TCB Memory Inspector,
   and Real-Life Metaphors in real-time
   ========================================================================== */

class RtosVisualizer {
  constructor() {
    this.vaultCounter = document.getElementById('vault-counter');
    this.vaultTypeLabel = document.getElementById('vault-type-label');
    this.vaultStatusText = document.getElementById('vault-status-text');
    this.tokenSlotsContainer = document.getElementById('token-slots-container');
    this.mutexVisualizer = document.getElementById('mutex-visualizer');
    this.mutexLockIcon = document.getElementById('mutex-lock-icon');
    this.mutexOwnerText = document.getElementById('mutex-owner-text');

    this.runningList = document.getElementById('running-task-list');
    this.readyList = document.getElementById('ready-queue-list');
    this.blockedList = document.getElementById('blocked-queue-list');
    this.tcbTableBody = document.getElementById('tcb-table-body');

    this.metaphorTitle = document.getElementById('metaphor-title');
    this.metaphorArt = document.getElementById('metaphor-art');
    this.metaphorDesc = document.getElementById('metaphor-desc');

    this.tickDisplay = document.getElementById('tick-display');
  }

  init() {
    window.rtosKernel.onStateChange(this.render.bind(this));
    window.rtosKernel.notifyState();
  }

  render(snapshot) {
    if (this.tickDisplay) {
      this.tickDisplay.textContent = `TICK: ${snapshot.tick} ms`;
    }

    this.renderActivePrimitive(snapshot.activePrimitive);
    this.renderQueues(snapshot);
    this.renderTcbTable(snapshot.tasks);
    this.renderMetaphor(snapshot.analogyMode, snapshot.activePrimitive);
  }

  renderActivePrimitive(prim) {
    if (!prim) return;

    if (prim.type === 'MUTEX') {
      if (this.vaultTypeLabel) this.vaultTypeLabel.textContent = `MUTEX: ${prim.name}`;
      if (this.vaultCounter) {
        this.vaultCounter.textContent = prim.state === 'LOCKED' ? 'LOCKED' : 'UNLOCKED';
        this.vaultCounter.className = `vault-counter ${prim.state === 'LOCKED' ? 'zero' : 'max'}`;
        this.vaultCounter.style.fontSize = '1.8rem';
      }
      if (this.vaultStatusText) {
        this.vaultStatusText.innerHTML = prim.owner 
          ? `Owned exclusively by: <b style="color:var(--neon-amber)">${prim.owner.name}</b>` 
          : `<span style="color:var(--neon-green)">Available for acquisition</span>`;
      }

      if (this.mutexVisualizer) this.mutexVisualizer.style.display = 'flex';
      if (this.tokenSlotsContainer) this.tokenSlotsContainer.style.display = 'none';

      if (this.mutexLockIcon) {
        this.mutexLockIcon.textContent = prim.state === 'LOCKED' ? '🔒' : '🔓';
      }
      if (this.mutexOwnerText) {
        this.mutexOwnerText.textContent = prim.owner ? `Held by: ${prim.owner.name} (Prio ${prim.owner.currentPriority})` : 'Free / Available';
      }
    } else {
      // Binary or Counting Semaphore
      if (this.mutexVisualizer) this.mutexVisualizer.style.display = 'none';
      if (this.tokenSlotsContainer) this.tokenSlotsContainer.style.display = 'flex';

      const isBin = prim.isBinary;
      if (this.vaultTypeLabel) {
        this.vaultTypeLabel.textContent = isBin ? `BINARY SEMAPHORE: ${prim.name}` : `COUNTING SEMAPHORE: ${prim.name}`;
      }
      if (this.vaultCounter) {
        this.vaultCounter.textContent = prim.count;
        this.vaultCounter.style.fontSize = '2.8rem';
        this.vaultCounter.className = `vault-counter ${prim.count === 0 ? 'zero' : prim.count === prim.maxCount ? 'max' : ''}`;
      }
      if (this.vaultStatusText) {
        this.vaultStatusText.innerHTML = prim.count === 0 
          ? `<span style="color:var(--neon-red)">All tokens exhausted (${prim.blockedQueue.length} tasks blocked)</span>`
          : `<span style="color:var(--neon-green)">${prim.count} of ${prim.maxCount} tokens available</span>`;
      }

      // Render Token slots
      if (this.tokenSlotsContainer) {
        this.tokenSlotsContainer.innerHTML = '';
        for (let i = 0; i < prim.maxCount; i++) {
          const slot = document.createElement('div');
          const isAvailable = i < prim.count;
          slot.className = `token-slot ${isAvailable ? 'available' : 'taken'}`;
          slot.innerHTML = isAvailable ? '🪙' : '✖';
          slot.title = isAvailable ? 'Token Available' : 'Token in use by a thread';
          this.tokenSlotsContainer.appendChild(slot);
        }
      }
    }
  }

  renderQueues(snapshot) {
    // 1. Running Task
    if (this.runningList) {
      this.runningList.innerHTML = '';
      if (snapshot.runningTask) {
        const badge = this.createTaskBadge(snapshot.runningTask, 'state-running');
        this.runningList.appendChild(badge);
      } else {
        this.runningList.innerHTML = '<div class="empty-state-text">CPU Idle (No task ready)</div>';
      }
    }

    // 2. Ready Queue
    if (this.readyList) {
      this.readyList.innerHTML = '';
      if (snapshot.readyQueue.length > 0) {
        snapshot.readyQueue.forEach(task => {
          const badge = this.createTaskBadge(task, 'state-ready');
          this.readyList.appendChild(badge);
        });
      } else {
        this.readyList.innerHTML = '<div class="empty-state-text">Ready queue empty</div>';
      }
    }

    // 3. Blocked Queue
    if (this.blockedList) {
      this.blockedList.innerHTML = '';
      const blockedTasks = snapshot.tasks.filter(t => t.state === 'BLOCKED');
      if (blockedTasks.length > 0) {
        blockedTasks.forEach(task => {
          const badge = this.createTaskBadge(task, 'state-blocked');
          this.blockedList.appendChild(badge);
        });
      } else {
        this.blockedList.innerHTML = '<div class="empty-state-text">No tasks currently blocked</div>';
      }
    }
  }

  createTaskBadge(task, stateClass) {
    const div = document.createElement('div');
    div.className = `task-badge ${stateClass}`;

    const isBoosted = task.currentPriority !== task.basePriority;
    const prioHtml = isBoosted
      ? `<span class="prio-tag prio-elevated" title="Priority boosted via Priority Inheritance Protocol!">Prio ${task.currentPriority} (was ${task.basePriority}) ⚡</span>`
      : `<span class="prio-tag">Prio ${task.currentPriority}</span>`;

    const blockedInfo = task.blockedOn ? `<span style="font-size:0.65rem; color:#fca5a5;"> [Waiting: ${task.blockedOn}]</span>` : '';

    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-weight:700; color:#fff;">${task.name}</span>
        ${blockedInfo}
      </div>
      <div>${prioHtml}</div>
    `;
    return div;
  }

  renderTcbTable(tasks) {
    if (!this.tcbTableBody) return;
    this.tcbTableBody.innerHTML = '';

    tasks.forEach(task => {
      const tr = document.createElement('tr');
      const isBoosted = task.currentPriority !== task.basePriority;
      const prioDisplay = isBoosted 
        ? `<b style="color:var(--neon-amber)">${task.currentPriority}*</b> (${task.basePriority})` 
        : `${task.basePriority}`;

      let stateBadge = `<span style="color:var(--neon-cyan)">READY</span>`;
      if (task.state === 'RUNNING') stateBadge = `<span style="color:var(--neon-green); font-weight:700;">RUNNING</span>`;
      if (task.state === 'BLOCKED') stateBadge = `<span style="color:var(--neon-red); font-weight:700;">BLOCKED</span>`;

      tr.innerHTML = `
        <td><b>${task.name}</b></td>
        <td>${prioDisplay}</td>
        <td>${stateBadge}</td>
        <td><code>${task.stackPointer}</code></td>
        <td style="color:${task.blockedOn ? 'var(--neon-amber)' : 'var(--text-dim)'}">
          ${task.blockedOn || 'None'}
        </td>
      `;
      this.tcbTableBody.appendChild(tr);
    });
  }

  renderMetaphor(mode, activePrim) {
    if (!this.metaphorTitle || !this.metaphorArt || !this.metaphorDesc) return;

    if (mode === 'mutex' || (activePrim && activePrim.type === 'MUTEX')) {
      this.metaphorTitle.textContent = 'Real-Life Metaphor: Airplane Restroom Key';
      this.metaphorArt.textContent = '✈️ 🔑 🚽';
      this.metaphorDesc.innerHTML = `
        <b>Ownership is strictly enforced:</b> Only the person who went inside and locked the door holds the key. No other passenger can unlock the door from outside! When unlocked, the key is handed to the next waiting person.
      `;
    } else if (mode === 'binary_sem' || (activePrim && activePrim.isBinary)) {
      this.metaphorTitle.textContent = 'Real-Life Metaphor: Railway Signal / ISR Trigger';
      this.metaphorArt.textContent = '🚦 🚂 ⚡';
      this.metaphorDesc.innerHTML = `
        <b>Signaling without ownership:</b> An electronic train sensor (Hardware ISR) flips the signal from Red (0) to Green (1) when a track clears. The train doesn't own the signal; it simply waits for the green flag to proceed!
      `;
    } else if (mode === 'counting_sem') {
      this.metaphorTitle.textContent = 'Real-Life Metaphor: Multi-Slot Parking Garage';
      this.metaphorArt.textContent = '🅿️ 🚗 🚙 🏎️';
      this.metaphorDesc.innerHTML = `
        <b>Resource counting:</b> The electronic board displays available spots (e.g. 3). Each entering car decrements the counter. When the count hits 0 (LOT FULL), incoming cars must wait at the barrier gate until another car exits!
      `;
    } else {
      this.metaphorTitle.textContent = 'Real-Life Metaphor: RTOS Kernel Dispatcher';
      this.metaphorArt.textContent = '⚙️ ⏱️ 🧠';
      this.metaphorDesc.innerHTML = `
        The RTOS Kernel coordinates threads like an air traffic controller, swapping register state during context switches and awakening blocked tasks as soon as semaphores are signaled.
      `;
    }
  }
}

window.rtosVisualizer = new RtosVisualizer();
