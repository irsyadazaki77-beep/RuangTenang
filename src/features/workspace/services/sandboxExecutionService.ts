import { CodeValidationResult, SandboxExecutionOptions } from './codeExecutionTypes';

const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_MAX_OUTPUT_ENTRIES = 100;
const DEFAULT_MAX_OUTPUT_CHARS = 50 * 1024; // 50 KB
const DEFAULT_MAX_CODE_SIZE_BYTES = 100 * 1024; // 100 KB

/**
 * Serializer aman untuk menangani argument console (menghindari error circular references, DOM refs, functions, dsb).
 */
function _safeSerializeArg(arg: any, depth = 0): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') return String(arg);
  if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
  if (typeof arg === 'symbol') return arg.toString();

  if (depth > 2) return '[Object/Array]';

  try {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (Array.isArray(arg)) {
      return `[${arg.slice(0, 50).map(item => _safeSerializeArg(item, depth + 1)).join(', ')}${arg.length > 50 ? ', ...' : ''}]`;
    }
    // Object
    const keys = Object.keys(arg).slice(0, 30);
    const entries = keys.map(k => {
      try {
        return `${JSON.stringify(k)}: ${_safeSerializeArg(arg[k], depth + 1)}`;
      } catch {
        return `${JSON.stringify(k)}: [Unreadable]`;
      }
    });
    return `{ ${entries.join(', ')} }`;
  } catch {
    return '[Non-serializable value]';
  }
}

/**
 * Worker script generator yang terisolasi ketat.
 * Dijalankan di Dedicated Web Worker.
 * - Memblokir API network (fetch, XMLHttpRequest, WebSocket, EventSource, importScripts).
 * - Menangkap console.log, console.warn, console.error, console.info.
 * - Membatasi jumlah log dan ukuran byte output.
 * - Mengembalikan pesan typed ke host.
 */
function createWorkerScript(userCode: string): string {
  // Sanitize script closing tag to prevent blob syntax breakage
  const escapedCode = userCode.replace(/<\/script>/gi, '<\\/script>');
  return `
    (function() {
      // 1. Matikan network dan dangerous APIs
      const disabledMsg = function(name) {
        return function() {
          throw new Error('Akses network (' + name + ') diblokir di sandbox ini demi keamanan.');
        };
      };

      if (typeof self.fetch !== 'undefined') self.fetch = disabledMsg('fetch');
      if (typeof self.XMLHttpRequest !== 'undefined') self.XMLHttpRequest = disabledMsg('XMLHttpRequest');
      if (typeof self.WebSocket !== 'undefined') self.WebSocket = disabledMsg('WebSocket');
      if (typeof self.EventSource !== 'undefined') self.EventSource = disabledMsg('EventSource');
      if (typeof self.importScripts !== 'undefined') self.importScripts = disabledMsg('importScripts');

      let logCount = 0;
      let totalChars = 0;
      const MAX_LOGS = 100;
      const MAX_CHARS = 50000;

      function safeFormat(arg, depth) {
        depth = depth || 0;
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') return String(arg);
        if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
        if (depth > 2) return '[Object]';
        try {
          if (arg instanceof Error) return arg.name + ': ' + arg.message;
          if (Array.isArray(arg)) {
            return '[' + arg.slice(0, 20).map(function(i) { return safeFormat(i, depth + 1); }).join(', ') + ']';
          }
          if (typeof arg === 'object') {
            const keys = Object.keys(arg).slice(0, 20);
            return '{ ' + keys.map(function(k) { return JSON.stringify(k) + ': ' + safeFormat(arg[k], depth + 1); }).join(', ') + ' }';
          }
        } catch(e) {
          return '[Unserializable]';
        }
        return String(arg);
      }

      function sendLog(type, args) {
        if (logCount >= MAX_LOGS) return;
        logCount++;
        const formatted = args.map(function(a) { return safeFormat(a, 0); }).join(' ');
        if (totalChars + formatted.length > MAX_CHARS) {
          self.postMessage({ type: 'log', level: 'warn', message: '[Batas kapasitas output tercapai]' });
          return;
        }
        totalChars += formatted.length;
        self.postMessage({ type: 'log', level: type, message: formatted });
      }

      // Override console
      self.console = {
        log: function() { sendLog('log', Array.prototype.slice.call(arguments)); },
        info: function() { sendLog('info', Array.prototype.slice.call(arguments)); },
        warn: function() { sendLog('warn', Array.prototype.slice.call(arguments)); },
        error: function() { sendLog('error', Array.prototype.slice.call(arguments)); }
      };

      function runPayload() {
        try {
          (function() {
            ${escapedCode}
          })();
          self.postMessage({ type: 'COMPLETE' });
        } catch (err) {
          const errMsg = (err && err.name ? err.name + ': ' : '') + ((err && err.message) ? err.message : String(err));
          self.postMessage({ type: 'ERROR', message: errMsg });
        }
      }

      self.onmessage = function(event) {
        const data = event.data;
        if (!data || data.type !== 'RUN') return;
        runPayload();
      };
    })();
  `;
}

export interface SandboxExecutionHandle {
  promise: Promise<CodeValidationResult>;
  stop: () => void;
}

/**
 * Menjalankan kode JavaScript dalam dedicated Web Worker terisolasi.
 * Mengembalikan handle yang berisi promise hasil eksekusi serta fungsi stop() pembatalan langsung.
 */
export function runJavaScriptInSandbox(
  code: string,
  options?: SandboxExecutionOptions
): SandboxExecutionHandle {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputEntries = options?.maxOutputEntries ?? DEFAULT_MAX_OUTPUT_ENTRIES;
  const _maxOutputChars = options?.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  const maxCodeSizeBytes = options?.maxCodeSizeBytes ?? DEFAULT_MAX_CODE_SIZE_BYTES;

  let worker: Worker | null = null;
  let objectUrl: string | null = null;
  let timerId: any = null;
  let isCleanedUp = false;
  let forceStopCallback: (() => void) | null = null;

  const stdout: string[] = [];
  const stderr: string[] = [];
  const warnings: string[] = [];
  const startTime = Date.now();

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (worker) {
      try {
        worker.terminate();
      } catch {
        // noop
      }
      worker = null;
    }
    if (objectUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // noop
      }
      objectUrl = null;
    }
  };

  const promise = new Promise<CodeValidationResult>((resolve) => {
    // 1. Periksa ukuran kode
    const codeSize = new Blob([code]).size;
    if (codeSize > maxCodeSizeBytes) {
      cleanup();
      return resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'unsupported',
        stdout: [],
        stderr: [`Ukuran kode (${Math.round(codeSize / 1024)} KB) melebihi batas maksimal sandbox (100 KB).`],
        warnings: [],
        durationMs: 0,
        message: 'Kode terlalu besar untuk dijalankan di sandbox lokal.'
      });
    }

    // 2. Cek ketersediaan Worker di browser environment
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
      cleanup();
      return resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'unsupported',
        stdout: [],
        stderr: ['Web Worker tidak didukung pada browser ini.'],
        warnings: [],
        durationMs: 0,
        message: 'Sandbox JavaScript tidak tersedia pada environment ini.'
      });
    }

    // 3. Inisialisasi Web Worker dari Blob
    try {
      const script = createWorkerScript(code);
      const blob = new Blob([script], { type: 'application/javascript' });
      objectUrl = URL.createObjectURL(blob);
      worker = new Worker(objectUrl);
    } catch (createErr: any) {
      cleanup();
      return resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'unsupported',
        stdout: [],
        stderr: [`Gagal membuat sandbox worker: ${createErr?.message || 'Akses Worker dibatasi CSP'}`],
        warnings: [],
        durationMs: 0,
        message: 'Sandbox JavaScript tidak tersedia pada environment ini.'
      });
    }

    forceStopCallback = () => {
      cleanup();
      resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'stopped',
        stdout,
        stderr: [...stderr, 'Eksekusi dihentikan oleh pengguna.'],
        warnings,
        durationMs: Date.now() - startTime,
        message: 'Eksekusi dihentikan.'
      });
    };

    // 4. Timer Timeout
    timerId = setTimeout(() => {
      cleanup();
      resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'timeout',
        stdout,
        stderr: ['Eksekusi dihentikan karena melewati batas waktu (timeout 2.5s).'],
        warnings,
        durationMs: timeoutMs,
        message: 'Eksekusi dihentikan karena melewati batas waktu.'
      });
    }, timeoutMs);

    // 5. Listener Pesan dari Worker
    worker.onmessage = (event: MessageEvent) => {
      if (isCleanedUp) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'log') {
        const text = String(data.message || '');
        if (stdout.length < maxOutputEntries) {
          if (data.level === 'error') {
            stderr.push(text);
          } else if (data.level === 'warn') {
            warnings.push(text);
          } else {
            stdout.push(text);
          }
        }
      } else if (data.type === 'COMPLETE') {
        const duration = Date.now() - startTime;
        cleanup();
        resolve({
          mode: 'sandbox',
          language: 'javascript',
          status: 'completed',
          stdout,
          stderr,
          warnings,
          durationMs: duration,
          message: stdout.length === 0 ? 'Kode selesai dieksekusi tanpa log output.' : undefined
        });
      } else if (data.type === 'ERROR') {
        const duration = Date.now() - startTime;
        cleanup();
        const errMsg = String(data.message || 'Kesalahan waktu eksekusi');
        stderr.push(errMsg);
        resolve({
          mode: 'sandbox',
          language: 'javascript',
          status: 'error',
          stdout,
          stderr,
          warnings,
          durationMs: duration,
          message: errMsg
        });
      }
    };

    worker.onerror = (errEvent: ErrorEvent) => {
      if (isCleanedUp) return;
      const duration = Date.now() - startTime;
      cleanup();
      const errMsg = errEvent?.message || 'Eksekusi sandbox worker menghasilkan kesalahan.';
      stderr.push(errMsg);
      resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'error',
        stdout,
        stderr,
        warnings,
        durationMs: duration,
        message: errMsg
      });
    };

    // 6. Jalankan kode
    try {
      worker.postMessage({ type: 'RUN', code });
    } catch (postErr: any) {
      cleanup();
      resolve({
        mode: 'sandbox',
        language: 'javascript',
        status: 'error',
        stdout,
        stderr: [postErr?.message || 'Gagal mengirim kode ke Worker'],
        warnings,
        durationMs: Date.now() - startTime,
        message: 'Gagal mengeksekusi kode di sandbox.'
      });
    }
  });

  return {
    promise,
    stop: () => {
      if (forceStopCallback) {
        forceStopCallback();
      } else {
        cleanup();
      }
    }
  };
}
