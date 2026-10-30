export function parseAgentResponse(outputText) {
  if (typeof outputText !== "string" || outputText.trim().length === 0) {
    throw new Error("La respuesta del agente está vacía.");
  }

  const normalizedOutput = outputText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(normalizedOutput);
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

  for (const [companyIndex, company] of parsed.empresas.entries()) {
    if (company === null || typeof company !== "object" || Array.isArray(company)) {
      throw new Error(`La empresa ${companyIndex + 1} no es un objeto válido.`);
    }

    const requiredCompanyStrings = [
      "nombre",
      "presenciaDigital",
      "sector",
      "domicilio",
      "municipio",
      "sitioWeb",
    ];
    for (const field of requiredCompanyStrings) {
      if (typeof company[field] !== "string") {
        throw new Error(`La empresa ${companyIndex + 1} requiere "${field}" como texto.`);
      }
    }
    if (!Number.isInteger(company.calificacion) || !Number.isInteger(company.estado)) {
      throw new Error(
        `La empresa ${companyIndex + 1} requiere "calificacion" y "estado" como enteros.`,
      );
    }
    if (!Array.isArray(company.prospectos)) {
      throw new Error(`La empresa ${companyIndex + 1} requiere una lista "prospectos" válida.`);
    }

    for (const [prospectIndex, prospect] of company.prospectos.entries()) {
      if (
        prospect === null ||
        typeof prospect !== "object" ||
        Array.isArray(prospect)
      ) {
        throw new Error(
          `El prospecto ${prospectIndex + 1} de la empresa ${companyIndex + 1} no es válido.`,
        );
      }
      for (const field of ["nombre", "cargo", "correo", "telefono", "notasIA"]) {
        if (typeof prospect[field] !== "string") {
          throw new Error(
            `El prospecto ${prospectIndex + 1} requiere "${field}" como texto.`,
          );
        }
      }
    }
  }

  return parsed;
}
