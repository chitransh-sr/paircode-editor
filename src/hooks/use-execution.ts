import { useState, useCallback } from "react";
import type { ExecutionResult } from "@/types/execution";

export function useExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const execute = useCallback(
    async (code: string, languageId: number, stdin?: string) => {
      setIsExecuting(true);
      setResult(null);

      try {
        const response = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, languageId, stdin }),
        });

        if (!response.ok) {
          throw new Error("Execution failed");
        }

        const data: ExecutionResult = await response.json();
        setResult(data);
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return { execute, isExecuting, result, clearResult };
}
