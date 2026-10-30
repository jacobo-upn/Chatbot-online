const SUCCESS_STATUSES = new Set([200, 201, 202]);
const RESPONSE_LOG_LIMIT = 4000;

function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}/<path-redacted>${url.search ? "?<redacted>" : ""}`;
  } catch {
    return "<URL no válida>";
  }
}

export function redactPowerAutomateUrlForLog(
  value,
  rawUrl = process.env.POWER_AUTOMATE_URL,
) {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return value;
  }

  rawUrl = rawUrl.trim();
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") {
    return value;
  }

  let redacted = serialized.replaceAll(rawUrl, redactUrl(rawUrl));
  try {
    const url = new URL(rawUrl);
    for (const [, secret] of url.searchParams) {
      if (secret.length > 0) {
        redacted = redacted.replaceAll(secret, "[REDACTED]");
      }
    }
  } catch {
    return JSON.parse(redacted);
  }

  return JSON.parse(redacted);
}

function describeError(error) {
  const name =
    error instanceof Error && /^[a-zA-Z0-9_.-]{1,80}$/.test(error.name)
      ? error.name
      : "UnknownError";
  const message =
    error instanceof Error
      ? error.message.replace(/https?:\/\/[^\s"'<>]+/gi, "<URL redactada>")
      : "Error inesperado.";
  const code =
    error && typeof error === "object" &&
    typeof error.code === "string" &&
    /^[a-zA-Z0-9_.-]{1,80}$/.test(error.code)
      ? error.code
      : undefined;

  return { name, message, ...(code ? { code } : {}) };
}

function getResponseBodyLog(body) {
  return body.length > RESPONSE_LOG_LIMIT
    ? `${body.slice(0, RESPONSE_LOG_LIMIT)}… (respuesta truncada para logging)`
    : body;
}

export async function saveToDataverseViaPowerAutomate(
  payload,
  {
    env = process.env,
    fetchImpl = fetch,
    logger = console,
    timeoutMs = 60_000,
  } = {},
) {
  const startedAt = Date.now();
  let outcome = "error";
  let destination = "<no configurada>";
  let operation = "configuration";
  let rawUrl;

  try {
    const configuredUrl = env.POWER_AUTOMATE_URL;
    if (typeof configuredUrl !== "string" || configuredUrl.trim().length === 0) {
      logger.error("POWER_AUTOMATE_URL no está configurada.");
      return { ok: false, error: "configuration" };
    }
    rawUrl = configuredUrl.trim();

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      logger.error("POWER_AUTOMATE_URL no contiene una URL válida.");
      return { ok: false, error: "configuration" };
    }

    destination = redactUrl(rawUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username.length > 0 ||
      parsedUrl.password.length > 0
    ) {
      logger.error("POWER_AUTOMATE_URL debe ser una URL HTTPS válida.", {
        destination,
      });
      return { ok: false, error: "configuration" };
    }

    const companyCount = Array.isArray(payload?.empresas)
      ? payload.empresas.length
      : 0;
    logger.info(
      "Enviando payload a Power Automate.",
      redactPowerAutomateUrlForLog({ destination, payload }, rawUrl),
    );

    operation = "serialize_payload";
    const body = JSON.stringify(payload);
    operation = "fetch";
    const response = await fetchImpl(rawUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    });
    operation = "read_response";
    const responseBody = await response.text();

    logger.info(
      "Respuesta recibida de Power Automate.",
      redactPowerAutomateUrlForLog(
        {
          destination,
          status: response.status,
          body: getResponseBodyLog(responseBody),
        },
        rawUrl,
      ),
    );

    if (!SUCCESS_STATUSES.has(response.status)) {
      logger.error("Power Automate respondió con un código HTTP no exitoso.", {
        destination,
        status: response.status,
      });
      return { ok: false, error: "http", status: response.status };
    }

    outcome = "success";
    logger.info("Prospectos almacenados por Power Automate.", {
      destination,
      companyCount,
      status: response.status,
    });
    return { ok: true, companyCount, status: response.status };
  } catch (error) {
    const diagnostic = describeError(error);
    const timedOut =
      diagnostic.name === "TimeoutError" || diagnostic.name === "AbortError";
    const errorType = timedOut
      ? "timeout"
      : operation === "fetch" || operation === "read_response"
        ? "network"
        : "unexpected";
    logger.error(
      timedOut
        ? "La solicitud a Power Automate excedió el tiempo límite."
        : "No fue posible completar la solicitud a Power Automate.",
      redactPowerAutomateUrlForLog(
        {
          destination,
          errorType,
          error: diagnostic,
        },
        rawUrl,
      ),
    );
    return { ok: false, error: errorType };
  } finally {
    logger.info("Tiempo de ejecución de Power Automate.", {
      destination,
      elapsedMs: Date.now() - startedAt,
      outcome,
    });
  }
}
