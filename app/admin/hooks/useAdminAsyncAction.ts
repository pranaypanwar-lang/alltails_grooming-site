"use client";

import { useCallback, useState } from "react";
import { useAdminToast } from "../components/common/AdminToastProvider";

type Options<TResult> = {
  successMessage?: string | ((result: TResult) => string);
  errorMessage?: string | ((error: unknown) => string);
};

export function useAdminAsyncAction<TResult = unknown>(options?: Options<TResult>) {
  const { showToast } = useAdminToast();
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(
    async (action: () => Promise<TResult>): Promise<TResult | undefined> => {
      try {
        setIsLoading(true);
        const result = await action();

        if (options?.successMessage) {
          const msg =
            typeof options.successMessage === "function"
              ? options.successMessage(result)
              : options.successMessage;
          if (msg) showToast(msg, true);
        }

        return result;
      } catch (error) {
        const fallback = error instanceof Error ? error.message : "Something went wrong.";
        const msg = options?.errorMessage
          ? typeof options.errorMessage === "function"
            ? options.errorMessage(error)
            : options.errorMessage
          : fallback;
        showToast(msg, false);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [showToast, options]
  );

  return { isLoading, run };
}
