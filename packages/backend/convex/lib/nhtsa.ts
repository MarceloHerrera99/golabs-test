const nhtsaBaseUrl = "https://vpic.nhtsa.dot.gov/api/vehicles";

const vehicleTerms = [
  "auto",
  "autos",
  "automovil",
  "automoviles",
  "car",
  "cars",
  "camioneta",
  "camionetas",
  "modelo",
  "modelos",
  "vehiculo",
  "vehiculos",
  "vehicle",
  "vehicles",
  "vin",
];

const makes = [
  "acura",
  "audi",
  "bmw",
  "buick",
  "cadillac",
  "chevrolet",
  "chrysler",
  "dodge",
  "fiat",
  "ford",
  "gmc",
  "honda",
  "hyundai",
  "infiniti",
  "jaguar",
  "jeep",
  "kia",
  "land rover",
  "lexus",
  "lincoln",
  "mazda",
  "mercedes-benz",
  "mercedes",
  "mini",
  "mitsubishi",
  "nissan",
  "polestar",
  "porsche",
  "ram",
  "rivian",
  "subaru",
  "tesla",
  "toyota",
  "volkswagen",
  "volvo",
];

export type NhtsaVehicleContext = {
  sourceName: string;
  sourceUrl: string;
  summary: string;
};

type NhtsaResponse<T> = {
  Count?: number;
  Message?: string;
  Results?: T[];
};

type NhtsaModel = {
  Make_Name?: string;
  Model_Name?: string;
  VehicleTypeName?: string;
};

type NhtsaVinValue = {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  VehicleType?: string;
  BodyClass?: string;
  Manufacturer?: string;
  PlantCountry?: string;
  ErrorText?: string;
};

export function looksLikeVehicleQuestion(question: string) {
  const normalized = normalize(question);
  return (
    extractVin(question) !== null ||
    vehicleTerms.some((term) => normalized.includes(term)) ||
    extractMake(question) !== null
  );
}

export async function fetchNhtsaVehicleContext(
  question: string
): Promise<NhtsaVehicleContext | null> {
  const vin = extractVin(question);

  if (vin) {
    return await fetchVinContext(vin);
  }

  const make = extractMake(question);

  if (!make) {
    return null;
  }

  return await fetchModelsContext(make, extractYear(question));
}

async function fetchVinContext(vin: string): Promise<NhtsaVehicleContext> {
  const sourceUrl = `${nhtsaBaseUrl}/DecodeVinValues/${encodeURIComponent(
    vin
  )}?format=json`;
  const data = await getJson<NhtsaResponse<NhtsaVinValue>>(sourceUrl);
  const result = data.Results?.[0];

  return {
    sourceName: "NHTSA vPIC - Decode VIN",
    sourceUrl,
    summary: [
      `VIN consultado: ${vin}`,
      `Marca: ${result?.Make || "sin dato"}`,
      `Modelo: ${result?.Model || "sin dato"}`,
      `Anio modelo: ${result?.ModelYear || "sin dato"}`,
      `Tipo de vehiculo: ${result?.VehicleType || "sin dato"}`,
      `Carroceria: ${result?.BodyClass || "sin dato"}`,
      `Fabricante: ${result?.Manufacturer || "sin dato"}`,
      `Pais de planta: ${result?.PlantCountry || "sin dato"}`,
      result?.ErrorText ? `Notas de NHTSA: ${result.ErrorText}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function fetchModelsContext(
  make: string,
  year: number | null
): Promise<NhtsaVehicleContext> {
  const makePath = encodeURIComponent(make);
  const sourceUrl = year
    ? `${nhtsaBaseUrl}/GetModelsForMakeYear/make/${makePath}/modelyear/${year}?format=json`
    : `${nhtsaBaseUrl}/GetModelsForMake/${makePath}?format=json`;
  const data = await getJson<NhtsaResponse<NhtsaModel>>(sourceUrl);
  const models = (data.Results ?? [])
    .map((model) => ({
      make: model.Make_Name || make,
      name: model.Model_Name || "sin nombre",
      type: model.VehicleTypeName,
    }))
    .slice(0, 60);

  const modelLines = models.map((model, index) => {
    const type = model.type ? ` (${model.type})` : "";
    return `${index + 1}. ${model.make} ${model.name}${type}`;
  });

  return {
    sourceName: "NHTSA vPIC - Vehicle models",
    sourceUrl,
    summary: [
      `Consulta: modelos para ${make}${year ? ` en ${year}` : ""}`,
      `Resultados devueltos por NHTSA: ${data.Count ?? models.length}`,
      ...modelLines,
    ].join("\n"),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`NHTSA respondio ${response.status}.`);
  }

  return (await response.json()) as T;
}

function extractVin(question: string) {
  const match = question.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  return match?.[0] ?? null;
}

function extractYear(question: string) {
  const match = question.match(/\b(19[9][6-9]|20[0-4][0-9])\b/);
  return match ? Number(match[0]) : null;
}

function extractMake(question: string) {
  const normalized = normalize(question);
  const sortedMakes = [...makes].sort((a, b) => b.length - a.length);
  return (
    sortedMakes.find((make) => {
      const escaped = make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(normalized);
    }) ?? null
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
