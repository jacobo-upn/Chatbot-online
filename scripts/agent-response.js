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

const OPPORTUNITY_RULES = [
  ["Inteligencia Artificial", /inteligencia artificial|\bia\b|machine learning/i],
  ["Automatización de procesos", /automatizaci[oó]n|automatizar|procesos/i],
  ["Desarrollo de software", /software|desarrollo|aplicaci[oó]n|plataforma/i],
  ["Modernización tecnológica", /modernizaci[oó]n|transformaci[oó]n digital|cloud|nube/i],
  ["Soporte técnico", /soporte|infraestructura|sistemas/i],
  ["Implementación de soluciones Microsoft", /microsoft|azure|dataverse|power platform/i],
];

function getPrimaryOpportunity(company) {
  const searchableText = [
    company.sector,
    company.presenciaDigital,
    ...company.prospectos.map((prospect) => prospect.notasIA),
  ].join(" ");

  return (
    OPPORTUNITY_RULES.find(([, pattern]) => pattern.test(searchableText))?.[0] ??
    "Evaluación tecnológica"
  );
}

export function buildAgentUserReply(payload) {
  const companies = payload.empresas;
  const companyRows = companies.map((company) => {
    const prospectCount = company.prospectos.length;
    return `${company.nombre} | ${company.calificacion} | ${getPrimaryOpportunity(company)} | ${prospectCount}`;
  });

  return [
    "Resumen ejecutivo",
    `Encontré ${companies.length} empresas prospecto en el sector ${companies[0].sector}.`,
    "",
    "Empresa | Calificación | Oportunidad principal | Prospectos",
    "--- | ---: | --- | ---:",
    ...companyRows,
    "",
    "La información quedó preparada para su registro.",
  ].join("\n");
}
