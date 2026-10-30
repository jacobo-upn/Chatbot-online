export function parseAgentResponse(outputText) {
  if (typeof outputText !== "string" || outputText.trim().length === 0) {
    throw new Error("La respuesta del agente está vacía.");
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("La respuesta del agente no contiene JSON válido.");
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !Object.hasOwn(parsed, "empresas") ||
    !Array.isArray(parsed.empresas)
  ) {
    throw new Error('La respuesta del agente no contiene una lista "empresas" válida.');
  }

  if (parsed.empresas.length === 0) {
    throw new Error('La lista "empresas" de la respuesta del agente está vacía.');
  }

  return parsed;
}
