/**
 * set first letter of a string to uppercase
 * @param str - the string to capitalize
 * @returns - the string with the first letter uppercased
 */
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isDefinedSignal(signal?: AbortSignal): signal is AbortSignal {
  return Boolean(signal);
}

/**
 * combine multiple abort signals into one
 * @param signals - the signals to listen to
 * @returns - the combined signal
 */
export function combineSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal | undefined {
  const definedSignals: Array<AbortSignal> = signals.filter(isDefinedSignal);
  if (definedSignals.length < 2) {
    return definedSignals[0];
  }
  const controller = new AbortController();

  function onAbort() {
    controller.abort();
    definedSignals.forEach((signal) => {
      signal.removeEventListener("abort", onAbort);
    });
  }

  definedSignals.forEach((signal) => {
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort);
    }
  });
  return controller.signal;
}
