import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentResponse } from "./agent-response.js";
import { buildAgentUserReply } from "./agent-response.js";
import {
  redactPowerAutomateUrlForLog,
  saveToDataverseViaPowerAutomate,
} from "./power-automate.js";

const validPayload = {
  empresas: [
    {
      nombre: "Ejemplo",
      calificacion: 1,
      presenciaDigital: "1",
      sector: "Pruebas",
      domicilio: "Domicilio",
      municipio: "Municipio",
      estado: 1,
      sitioWeb: "https://example.com",
      prospectos: [
        {
          nombre: "Prospecto",
          cargo: "Cargo",
          correo: "prospecto@example.com",
          telefono: "5550000000",
          notasIA: "Notas",
        },
      ],
    },
  ],
};

test("parseAgentResponse rejects empty, invalid, and incomplete responses", () => {
  assert.throws(() => parseAgentResponse(" "), /vacía/);
  assert.throws(() => parseAgentResponse("{"), /JSON válido/);
  assert.throws(() => parseAgentResponse("{}"), /empresas/);
  assert.throws(() => parseAgentResponse('{"empresas":[]}'), /vacía/);
});

test("parseAgentResponse rejects payloads that do not match the Power Automate schema", () => {
  assert.throws(
    () => parseAgentResponse('{"empresas":[{"nombre":"Ejemplo"}]}'),
    /requiere "presenciaDigital"/,
  );
});

test("parseAgentResponse accepts a company without prospects", () => {
  const payloadWithoutProspects = structuredClone(validPayload);
  payloadWithoutProspects.empresas[0].prospectos = [];
  assert.deepEqual(
    parseAgentResponse(JSON.stringify(payloadWithoutProspects)),
    payloadWithoutProspects,
  );
});

test("parseAgentResponse returns valid agent JSON", () => {
  assert.deepEqual(
    parseAgentResponse(JSON.stringify(validPayload)),
    validPayload,
  );
});

test("parseAgentResponse accepts JSON inside a Markdown code fence", () => {
  assert.deepEqual(
    parseAgentResponse(`\n\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``),
    validPayload,
  );
});

test("buildAgentUserReply hides the integration payload", () => {
  const reply = buildAgentUserReply(validPayload);

  assert.match(reply, /Resumen ejecutivo/);
  assert.match(reply, /Ejemplo \| 1 \|/);
  assert.doesNotMatch(reply, /prospecto@example\.com/);
  assert.doesNotMatch(reply, /\"empresas\"/);
});

test("saveToDataverseViaPowerAutomate posts the complete payload", async () => {
  const logged = [];
  let requestUrl;
  let requestOptions;

  const result = await saveToDataverseViaPowerAutomate(validPayload, {
    env: { POWER_AUTOMATE_URL: "https://flow.example.test/hook?sig=secret" },
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return { status: 202, text: async () => "accepted" };
    },
    logger: {
      info: (...args) => logged.push(args),
      error: (...args) => logged.push(args),
    },
  });

  assert.deepEqual(result, { ok: true, companyCount: 1, status: 202 });
  assert.equal(requestUrl, "https://flow.example.test/hook?sig=secret");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(requestOptions.body), validPayload);
  assert.equal(requestOptions.signal.aborted, false);
  assert.equal(requestOptions.redirect, "error");
  assert.ok(logged.every((entry) => !JSON.stringify(entry).includes("secret")));
});

test("saveToDataverseViaPowerAutomate reports HTTP failures without throwing", async () => {
  const result = await saveToDataverseViaPowerAutomate(validPayload, {
    env: { POWER_AUTOMATE_URL: "https://flow.example.test/hook" },
    fetchImpl: async () => ({ status: 500, text: async () => "failed" }),
    logger: { info() {}, error() {} },
  });

  assert.deepEqual(result, { ok: false, error: "http", status: 500 });
});

test("saveToDataverseViaPowerAutomate aborts requests after the timeout", async () => {
  const result = await saveToDataverseViaPowerAutomate(validPayload, {
    env: { POWER_AUTOMATE_URL: "https://flow.example.test/hook" },
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
    logger: { info() {}, error() {} },
    timeoutMs: 1,
  });

  assert.deepEqual(result, { ok: false, error: "timeout" });
});

test("saveToDataverseViaPowerAutomate reports network failures", async () => {
  const result = await saveToDataverseViaPowerAutomate(validPayload, {
    env: { POWER_AUTOMATE_URL: "https://flow.example.test/hook" },
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
    logger: { info() {}, error() {} },
  });

  assert.deepEqual(result, { ok: false, error: "network" });
});

test("saveToDataverseViaPowerAutomate catches unexpected exceptions", async () => {
  const cyclicPayload = { empresas: [] };
  cyclicPayload.self = cyclicPayload;
  const result = await saveToDataverseViaPowerAutomate(cyclicPayload, {
    env: { POWER_AUTOMATE_URL: "https://flow.example.test/hook" },
    fetchImpl: async () => {
      throw new Error("The request should not be sent.");
    },
    logger: { info() {}, error() {} },
  });

  assert.deepEqual(result, { ok: false, error: "unexpected" });
});

test("saveToDataverseViaPowerAutomate skips unconfigured destinations", async () => {
  let called = false;
  const result = await saveToDataverseViaPowerAutomate(validPayload, {
    env: {},
    fetchImpl: async () => {
      called = true;
    },
    logger: { info() {}, error() {} },
  });

  assert.deepEqual(result, { ok: false, error: "configuration" });
  assert.equal(called, false);
});

test("redactPowerAutomateUrlForLog hides the configured URL and query tokens", () => {
  const rawUrl = "https://flow.example.test/hook?sig=sensitive-token";
  const redacted = redactPowerAutomateUrlForLog(
    { payload: rawUrl, token: "sensitive-token" },
    rawUrl,
  );

  assert.equal(JSON.stringify(redacted).includes(rawUrl), false);
  assert.equal(JSON.stringify(redacted).includes("sensitive-token"), false);
});

test("redactPowerAutomateUrlForLog preserves numeric values", () => {
  const redacted = redactPowerAutomateUrlForLog(
    { calificacion: 1, presenciaDigital: 1 },
    "https://flow.example.test/hook?sig=1",
  );

  assert.deepEqual(redacted, { calificacion: 1, presenciaDigital: 1 });
});
