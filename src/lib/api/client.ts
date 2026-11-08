function errorMessage(body: unknown) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : null;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const timeoutSignal = AbortSignal.timeout(10_000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(input, { ...init, headers, signal });

  if (!response.ok) {
    const message = errorMessage(await response.json().catch(() => null));
    throw new ApiRequestError(message ?? `API request failed: ${response.status}`, response.status);
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- callers name the shape the study API returns
  return (await response.json()) as T;
}
