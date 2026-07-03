import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = process.cwd();
const outputsDir = path.join(rootDir, "outputs");
const validationDir = path.join(outputsDir, "ftc_validation");
const previewDir = path.join(validationDir, "previews");
const candidateCsvPath = path.join(outputsDir, "ftc_candidate_table.csv");
const selectedCsvPath = path.join(outputsDir, "ftc_selected_clusters.csv");
const commentsCsvPath = path.join(outputsDir, "comment_topics_clusters.csv");
const outputPath = path.join(validationDir, "ftc_validasi_entropy_overlap.xlsx");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function colName(columnNumberOneBased) {
  let value = columnNumberOneBased;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function parseDocIds(clusterCandidate) {
  return [...clusterCandidate.matchAll(/D(\d+)/g)].map((match) => Number(match[1]));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeMatrix(sheet, startRow, startCol, matrix) {
  if (!matrix.length || !matrix[0].length) return;
  sheet.getRangeByIndexes(startRow, startCol, matrix.length, matrix[0].length).values = matrix;
}

function writeFormulas(sheet, startRow, startCol, matrix) {
  if (!matrix.length || !matrix[0].length) return;
  sheet.getRangeByIndexes(startRow, startCol, matrix.length, matrix[0].length).formulas = matrix;
}

function styleHeader(range) {
  range.format = {
    fill: "#173B7A",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "middle",
  };
}

function styleTable(range) {
  range.format = {
    borders: { preset: "all", style: "thin", color: "#C9D4E5" },
    verticalAlignment: "top",
    wrapText: true,
  };
}

await fs.mkdir(previewDir, { recursive: true });

const candidateRows = parseCsv(await fs.readFile(candidateCsvPath, "utf8"));
const selectedRows = parseCsv(await fs.readFile(selectedCsvPath, "utf8"));
const commentRows = parseCsv(await fs.readFile(commentsCsvPath, "utf8"));

const iterationOne = candidateRows
  .filter((row) => Number(row.iteration) === 1)
  .sort((a, b) => Number(a.no_cluster) - Number(b.no_cluster));

const docCount = commentRows.length;
const candidateCount = iterationOne.length;
const docStartColIndex = 5; // F
const docStartCol = colName(docStartColIndex + 1);
const docEndCol = colName(docStartColIndex + docCount);
const candidateStartRow = 8;
const candidateEndRow = candidateStartRow + candidateCount - 1;

const workbook = Workbook.create();
const candidatesSheet = workbook.worksheets.add("FTC Candidates");
const validationSheet = workbook.worksheets.add("EO Validation");
const selectedSheet = workbook.worksheets.add("Selected Clusters");

for (const sheet of [candidatesSheet, validationSheet, selectedSheet]) {
  sheet.showGridLines = false;
}

// Sheet 1: table like the FTC slide.
candidatesSheet.getRange("A1:G1").merge();
candidatesSheet.getRange("A1").values = [["Tahap 1. Kemunculan frequent term pada beberapa dokumen"]];
candidatesSheet.getRange("A1").format = {
  fill: "#173B7A",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
candidatesSheet.getRange("A2:G2").merge();
candidatesSheet.getRange("A2").values = [[`FTC Iterasi 1, minimum support = 8 dokumen, jumlah kandidat = ${candidateCount}`]];

writeMatrix(candidatesSheet, 3, 0, [[
  "No Cluster",
  "Frequent term set",
  "Cluster candidate",
  "Support",
  "EO Python",
  "EO Excel",
  "Selisih",
]]);

const candidateTableValues = iterationOne.map((row) => [
  Number(row.no_cluster),
  row.frequent_term_set,
  row.cluster_candidate,
  toNumber(row.support),
  toNumber(row.eo),
  null,
  null,
]);
writeMatrix(candidatesSheet, 4, 0, candidateTableValues);

const candidateFormulaRows = iterationOne.map((_, index) => {
  const excelRow = 5 + index;
  const validationRow = candidateStartRow + index;
  return [
    `='EO Validation'!E${validationRow}`,
    `=ABS(E${excelRow}-F${excelRow})`,
  ];
});
writeFormulas(candidatesSheet, 4, 5, candidateFormulaRows);

candidatesSheet.getRange("A4:G4").format = {
  fill: "#173B7A",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  wrapText: true,
};
styleTable(candidatesSheet.getRange(`A4:G${4 + candidateCount}`));
candidatesSheet.getRange("A:A").format.columnWidthPx = 82;
candidatesSheet.getRange("B:B").format.columnWidthPx = 180;
candidatesSheet.getRange("C:C").format.columnWidthPx = 620;
candidatesSheet.getRange("D:G").format.columnWidthPx = 90;
candidatesSheet.getRange(`D5:G${4 + candidateCount}`).format.numberFormat = "0.000000";
candidatesSheet.freezePanes.freezeRows(4);

// Sheet 2: formula validation for EO.
validationSheet.getRange("A1:E1").merge();
validationSheet.getRange("A1").values = [["Tahap 2. Penerapan Persamaan Entropy Overlap (EO)"]];
validationSheet.getRange("A1").format = {
  fill: "#173B7A",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
validationSheet.getRange("A2:E2").merge();
validationSheet.getRange("A2").values = [[
  "EO dihitung dengan kontribusi per dokumen: ((-1/f_d) * LN(1/f_d)); f_d adalah jumlah kandidat cluster yang memuat dokumen D tersebut.",
]];

writeMatrix(validationSheet, 3, 0, [["Frekuensi dokumen f_d", "", "", "", ""]]);
writeMatrix(validationSheet, 4, 0, [["Kontribusi EO per dokumen", "", "", "", ""]]);

const docHeaders = Array.from({ length: docCount }, (_, index) => `D${index + 1}`);
writeMatrix(validationSheet, 3, docStartColIndex, [docHeaders]);

const frequencyFormulas = docHeaders.map((_, index) => {
  const column = colName(docStartColIndex + index + 1);
  return `=SUM(${column}$${candidateStartRow}:${column}$${candidateEndRow})`;
});
const contributionFormulas = docHeaders.map((_, index) => {
  const column = colName(docStartColIndex + index + 1);
  return `=IF(${column}$4>1,((-1/${column}$4)*LN(1/${column}$4)),0)`;
});
writeFormulas(validationSheet, 3, docStartColIndex, [frequencyFormulas]);
writeFormulas(validationSheet, 4, docStartColIndex, [contributionFormulas]);

writeMatrix(validationSheet, 6, 0, [[
  "No Cluster",
  "Frequent term set",
  "Cluster candidate",
  "Support",
  "EO Excel",
  ...docHeaders,
]]);

const membershipRows = iterationOne.map((row) => {
  const docs = new Set(parseDocIds(row.cluster_candidate));
  return [
    Number(row.no_cluster),
    row.frequent_term_set,
    row.cluster_candidate,
    null,
    null,
    ...Array.from({ length: docCount }, (_, index) => (docs.has(index + 1) ? 1 : 0)),
  ];
});
writeMatrix(validationSheet, 7, 0, membershipRows);

const validationFormulas = iterationOne.map((_, index) => {
  const excelRow = candidateStartRow + index;
  return [
    `=SUM(${docStartCol}${excelRow}:${docEndCol}${excelRow})`,
    `=SUMPRODUCT(${docStartCol}${excelRow}:${docEndCol}${excelRow},$${docStartCol}$5:$${docEndCol}$5)`,
  ];
});
writeFormulas(validationSheet, 7, 3, validationFormulas);

styleHeader(validationSheet.getRange(`A7:${docEndCol}7`));
styleTable(validationSheet.getRange(`A7:${docEndCol}${candidateEndRow}`));
validationSheet.getRange("A:A").format.columnWidthPx = 82;
validationSheet.getRange("B:B").format.columnWidthPx = 180;
validationSheet.getRange("C:C").format.columnWidthPx = 620;
validationSheet.getRange("D:E").format.columnWidthPx = 95;
validationSheet.getRangeByIndexes(0, docStartColIndex, candidateEndRow, docCount).format.columnWidthPx = 38;
validationSheet.getRange(`D8:E${candidateEndRow}`).format.numberFormat = "0.000000";
validationSheet.getRange(`${docStartCol}4:${docEndCol}5`).format.numberFormat = "0.000000";
validationSheet.freezePanes.freezeRows(7);
validationSheet.freezePanes.freezeColumns(5);

// Sheet 3: selected clusters per FTC iteration.
selectedSheet.getRange("A1:F1").merge();
selectedSheet.getRange("A1").values = [["Cluster Terpilih FTC per Iterasi"]];
selectedSheet.getRange("A1").format = {
  fill: "#173B7A",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
writeMatrix(selectedSheet, 3, 0, [[
  "Iteration",
  "Cluster ID",
  "Frequent termset",
  "Support",
  "Entropy Overlap",
  "Remaining docs after",
]]);
writeMatrix(selectedSheet, 4, 0, selectedRows.map((row) => [
  Number(row.iteration),
  Number(row.cluster_id),
  row.frequent_termset,
  toNumber(row.support),
  toNumber(row.entropy_overlap),
  toNumber(row.n_remaining_docs_after),
]));
styleHeader(selectedSheet.getRange("A4:F4"));
styleTable(selectedSheet.getRange(`A4:F${4 + selectedRows.length}`));
selectedSheet.getRange("A:B").format.columnWidthPx = 90;
selectedSheet.getRange("C:C").format.columnWidthPx = 220;
selectedSheet.getRange("D:F").format.columnWidthPx = 120;
selectedSheet.getRange(`E5:E${4 + selectedRows.length}`).format.numberFormat = "0.000000";
selectedSheet.freezePanes.freezeRows(4);

for (const [sheetName, range, fileName] of [
  ["FTC Candidates", "A1:G25", "ftc_candidates_preview.png"],
  ["EO Validation", "A1:K25", "eo_validation_preview.png"],
  ["Selected Clusters", "A1:F25", "selected_clusters_preview.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await preview.arrayBuffer()));
}

const inspection = await workbook.inspect({
  kind: "table",
  sheetId: "FTC Candidates",
  range: "A1:G12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 7,
});
console.log(inspection.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 200 },
  summary: "final formula error scan",
});
console.log(formulaErrors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
