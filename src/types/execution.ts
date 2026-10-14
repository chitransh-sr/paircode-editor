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
  preview?: "html" | "css" | "script" | "react" | "web";
  /** Multi-file definitions (e.g. Web mode: index.html + styles.css). */
  files?: RoomFile[];
  /** Hidden from language pickers (legacy modes kept working for old rooms). */
  hidden?: boolean;
}

/** A single editable file inside a (possibly multi-file) language mode. */
export interface RoomFile {
  name: string;
  monacoLanguage: string;
  defaultCode: string;
}
