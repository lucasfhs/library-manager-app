// Byte order mark so spreadsheet apps detect UTF-8.
const BOM = String.fromCharCode(0xfeff);

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = [headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((line) => line.map(escape).join(";"))
    .join("\n");
  const blob = new Blob([BOM + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
