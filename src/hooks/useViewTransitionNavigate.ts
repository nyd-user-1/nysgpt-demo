import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";

type StartViewTransitionFn = (callback: () => void) => { finished: Promise<void> };

export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      const start = (document as unknown as { startViewTransition?: StartViewTransitionFn })
        .startViewTransition;
      if (typeof start !== "function") {
        navigate(to as string, options);
        return;
      }
      start.call(document, () => {
        flushSync(() => {
          navigate(to as string, options);
        });
      });
    },
    [navigate]
  );
}
