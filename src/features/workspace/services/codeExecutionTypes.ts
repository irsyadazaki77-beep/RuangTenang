export type CodeExecutionStatus =
  | 'idle'
  | 'checking'
  | 'running'
  | 'completed'
  | 'timeout'
  | 'stopped'
  | 'error'
  | 'unsupported';

export type CodeValidationMode = 'static' | 'sandbox';

export interface CodeValidationResult {
  mode: CodeValidationMode;
  language: string;
  status: CodeExecutionStatus;
  stdout: string[];
  stderr: string[];
  warnings: string[];
  durationMs?: number;
  message?: string;
}

export interface SandboxExecutionOptions {
  timeoutMs?: number;
  maxOutputEntries?: number;
  maxOutputChars?: number;
  maxCodeSizeBytes?: number;
}
