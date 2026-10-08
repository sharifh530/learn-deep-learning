/**
 * NeuroQuest: Dual Python Execution Engine
 * Manages client-side WebAssembly (Pyodide + NumPy + Microtorch) in a dedicated Web Worker
 * and seamlessly bridges to local FastAPI native PyTorch server.
 */

export class PythonEngineService {
  constructor() {
    this.worker = null;
    this.engineMode = (typeof localStorage !== 'undefined' ? localStorage.getItem('nq_python_engine_mode') : null) || 'wasm';
    this.wasmStatus = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'
    this.wasmStatusMessage = 'Initializing WebAssembly...';
    this.backendUrl = (typeof localStorage !== 'undefined' ? localStorage.getItem('nq_backend_url') : null) || 'http://localhost:8000';
    this.backendOnline = false;
    this.listeners = new Set();
    this.pendingExecutions = new Map();
    this.runIdCounter = 1;
    this.initTimeout = null;
  }

  onStatusChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyStatus() {
    const status = this.getStatus();
    this.listeners.forEach(fn => {
      try { fn(status); } catch (e) { console.error(e); }
    });
  }

  getStatus() {
    return {
      mode: this.engineMode,
      wasmStatus: this.wasmStatus,
      wasmMessage: this.wasmStatusMessage,
      backendOnline: this.backendOnline,
      isReady: this.engineMode === 'wasm' ? this.wasmStatus === 'ready' : this.backendOnline
    };
  }

  setMode(mode) {
    if (mode !== 'wasm' && mode !== 'backend') return;
    this.engineMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nq_python_engine_mode', mode);
    }
    this.notifyStatus();
  }

  setBackendOnline(isOnline) {
    this.backendOnline = isOnline;
    this.notifyStatus();
  }

  initWasmWorker() {
    if (this.worker) return;

    this.wasmStatus = 'loading';
    this.wasmStatusMessage = 'Connecting to WebAssembly Python Worker...';
    this.notifyStatus();

    try {
      this.worker = new Worker('/pyodide_worker.js');

      this.worker.onmessage = (e) => {
        const data = e.data || {};

        if (data.type === 'status') {
          this.wasmStatus = 'loading';
          this.wasmStatusMessage = data.message || 'Loading Pyodide packages...';
          this.notifyStatus();
        } else if (data.type === 'ready') {
          this.wasmStatus = 'ready';
          this.wasmStatusMessage = 'WebAssembly Pyodide Ready (NumPy + PyTorch Emulated)';
          this.notifyStatus();
        } else if (data.type === 'init_error') {
          this.wasmStatus = 'error';
          this.wasmStatusMessage = `Pyodide init error: ${data.error}`;
          this.notifyStatus();
        } else if (data.type === 'output') {
          const { runId, success, output, error, durationMs } = data;
          if (this.pendingExecutions.has(runId)) {
            const { resolve, timer } = this.pendingExecutions.get(runId);
            clearTimeout(timer);
            this.pendingExecutions.delete(runId);
            resolve({
              success,
              output: output || '',
              error: error || null,
              durationMs: durationMs || 0,
              engine: 'wasm'
            });
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Pyodide Worker encountered an error:', err);
        this.wasmStatus = 'error';
        this.wasmStatusMessage = 'WebAssembly Worker offline. Check network connection.';
        this.notifyStatus();
      };

      // Send initial ping to ensure worker spins up
      this.worker.postMessage({ type: 'init' });
    } catch (err) {
      this.wasmStatus = 'error';
      this.wasmStatusMessage = `Failed to create worker: ${err.message}`;
      this.notifyStatus();
    }
  }

  async execute(code) {
    if (this.engineMode === 'backend') {
      return this.executeViaBackend(code);
    }
    return this.executeViaWasm(code);
  }

  async executeViaBackend(code) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${this.backendUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const durationMs = Math.round(performance.now() - t0);

      return {
        success: !!data.success,
        output: data.output || '',
        error: data.error || null,
        durationMs,
        engine: 'backend'
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      return {
        success: false,
        output: '',
        error: `FastAPI Server Error: ${err.message}\n(Tip: Switch to In-Browser WebAssembly mode above to run client-side with zero server dependencies!)`,
        durationMs,
        engine: 'backend'
      };
    }
  }

  executeViaWasm(code) {
    if (!this.worker || this.wasmStatus === 'idle') {
      this.initWasmWorker();
    }

    if (this.wasmStatus === 'loading') {
      return new Promise((resolve) => {
        // Wait up to 10s for loading to finish
        const checkInterval = setInterval(() => {
          if (this.wasmStatus === 'ready') {
            clearInterval(checkInterval);
            resolve(this.dispatchWasmJob(code));
          } else if (this.wasmStatus === 'error') {
            clearInterval(checkInterval);
            resolve({
              success: false,
              output: '',
              error: 'Failed to load Pyodide WebAssembly runtime. Please ensure internet access is available to fetch CDN packages.',
              durationMs: 0,
              engine: 'wasm'
            });
          }
        }, 200);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (this.wasmStatus !== 'ready') {
            resolve({
              success: false,
              output: '',
              error: 'Pyodide initialization timed out. Please try again or switch to Local PyTorch Server.',
              durationMs: 0,
              engine: 'wasm'
            });
          }
        }, 12000);
      });
    }

    if (this.wasmStatus === 'error') {
      return Promise.resolve({
        success: false,
        output: '',
        error: `Pyodide WebAssembly Error: ${this.wasmStatusMessage}`,
        durationMs: 0,
        engine: 'wasm'
      });
    }

    return this.dispatchWasmJob(code);
  }

  dispatchWasmJob(code) {
    return new Promise((resolve) => {
      const runId = this.runIdCounter++;

      // Watchdog timer: kill job after 8 seconds if user runs infinite loop
      const timer = setTimeout(() => {
        if (this.pendingExecutions.has(runId)) {
          this.pendingExecutions.delete(runId);
          console.warn('Execution timed out after 8s. Re-spawning Pyodide Worker...');
          if (this.worker) {
            this.worker.terminate();
            this.worker = null;
          }
          this.initWasmWorker();
          resolve({
            success: false,
            output: '',
            error: 'Execution Timed Out (8.0s limit exceeded). Possible infinite loop in user code.',
            durationMs: 8000,
            engine: 'wasm'
          });
        }
      }, 8000);

      this.pendingExecutions.set(runId, { resolve, timer });
      this.worker.postMessage({ type: 'execute', code, runId });
    });
  }
}

// Global Singleton
export const pythonEngine = new PythonEngineService();
