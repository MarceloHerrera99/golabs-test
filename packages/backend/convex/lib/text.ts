export type CsvParseResult = {
  headers: string[];
  rowCount: number;
  text: string;
};

const chunkSize = 6000;
const chunkOverlap = 600;

export function chunkText(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const chunks: string[] = [];
  let index = 0;

  while (index < normalized.length) {
    const end = Math.min(index + chunkSize, normalized.length);
    const slice = normalized.slice(index, end).trim();

    if (slice) {
      chunks.push(slice);
    }

    if (end >= normalized.length) {
      break;
    }

    index = Math.max(0, end - chunkOverlap);
  }

  return chunks;
}

export function parseCsv(csv: string): CsvParseResult {
  const rows = parseCsvRows(csv);
  const rawHeaders = rows.shift() ?? [];
  const headers = rawHeaders.map((header, index) => {
    const trimmed = header.trim();
    return trimmed || `column_${index + 1}`;
  });

  const normalizedRows = rows.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );

  const tableLines = normalizedRows.map((row, index) => {
    const fields = headers.map((header, columnIndex) => {
      const value = row[columnIndex]?.trim() || "(vacio)";
      return `${header}: ${value}`;
    });

    return `Fila ${index + 1}: ${fields.join(" | ")}`;
  });

  const text = [
    `Columnas: ${headers.join(", ") || "sin encabezados"}`,
    `Total de filas: ${normalizedRows.length}`,
    ...tableLines,
  ].join("\n");

  return {
    headers,
    rowCount: normalizedRows.length,
    text,
  };
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows;
}
