export type ExecutionResult =
  | {
      success: true;
      stdout: string;
      stderr: string;
      exit_code: number;
      execution_time: number;
    }
  | {
      success: false;
      error: string;
    };

export interface LanguageMeta {
  id: number;
  name: string;
  label: string;
  monacoLanguage: string;
  defaultCode: string;
  /** Live-preview strategy for the Preview tab (absent = not previewable). */
  preview?: "html" | "css" | "script" | "react";
}
