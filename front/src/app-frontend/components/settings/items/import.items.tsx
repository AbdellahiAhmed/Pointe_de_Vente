import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  faUpload,
  faDownload,
  faFileImport,
  faCheckCircle,
  faTimesCircle,
  faFileCsv,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Modal } from "../../../../app-common/components/modal/modal";
import { Button } from "../../../../app-common/components/input/button";
import { request } from "../../../../api/request/request";
import { PRODUCT_UPLOAD } from "../../../../api/routing/routes/backend.app";
import { notify } from "../../../../app-common/components/confirm/notification";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  "name",
  "barcode",
  "purchasePrice",
  "salePrice",
  "minPrice",
  "quantity",
  "category",
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];
type CsvRow = Record<CsvColumn, string>;

interface ImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

type ImportPhase = "idle" | "preview" | "uploading" | "done";

// ---------------------------------------------------------------------------
// CSV helpers  (no external library)
// ---------------------------------------------------------------------------

/**
 * Parses a single CSV line respecting double-quoted fields that may
 * contain commas or embedded quotes (RFC 4180 subset).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek at next char – escaped quote ("") or closing quote?
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parses a full CSV string.  Returns:
 *  - headers: the first row values
 *  - rows: remaining rows as string[][]
 */
function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  const [headerLine, ...dataLines] = lines;
  const headers = parseCsvLine(headerLine);
  const rows = dataLines.map(parseCsvLine);

  return { headers, rows };
}

/**
 * Maps raw parsed rows to typed CsvRow objects using the expected column names.
 * Tolerant: if a header is missing it fills with an empty string.
 */
function mapRowsToCsvRows(
  headers: string[],
  rows: string[][]
): CsvRow[] {
  return rows.map((cols) => {
    const entry = {} as CsvRow;
    CSV_COLUMNS.forEach((col) => {
      const idx = headers.findIndex(
        (h) => h.toLowerCase().trim() === col.toLowerCase()
      );
      entry[col] = idx >= 0 && idx < cols.length ? cols[idx] : "";
    });
    return entry;
  });
}

// ---------------------------------------------------------------------------
// Template download
// ---------------------------------------------------------------------------

function downloadTemplate(): void {
  const header = CSV_COLUMNS.join(",");
  const blob = new Blob([header + "\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  onFileSelected,
  isDragging,
  setIsDragging,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected, setIsDragging]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    },
    [setIsDragging]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
      // reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? "#4f46e5" : "#d1d5db"}`,
        borderRadius: "0.75rem",
        backgroundColor: isDragging ? "#eef2ff" : "#f9fafb",
        padding: "2.5rem 1.5rem",
        cursor: "pointer",
        transition: "border-color 0.2s ease, background-color 0.2s ease",
        textAlign: "center",
        userSelect: "none",
      }}
      role="button"
      tabIndex={0}
      aria-label={t("Drop CSV file here or click to browse")}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      <FontAwesomeIcon
        icon={faFileCsv}
        size="3x"
        style={{ color: isDragging ? "#4f46e5" : "#9ca3af", marginBottom: "0.75rem" }}
      />
      <p style={{ margin: "0.25rem 0 0", fontWeight: 600, color: "#374151" }}>
        {t("Drop your CSV file here")}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
        {t("or click to browse")}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={handleInputChange}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Preview table
// ---------------------------------------------------------------------------

interface PreviewTableProps {
  rows: CsvRow[];
  totalRows: number;
}

const PREVIEW_LIMIT = 5;

const PreviewTable: React.FC<PreviewTableProps> = ({ rows, totalRows }) => {
  const { t } = useTranslation();
  const preview = rows.slice(0, PREVIEW_LIMIT);

  return (
    <div style={{ overflowX: "auto", marginTop: "1rem" }}>
      <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
        {t("Previewing first {{count}} of {{total}} rows", {
          count: preview.length,
          total: totalRows,
        })}
      </p>
      <table className="table table-sm table-bordered table-hover" style={{ fontSize: "0.82rem" }}>
        <thead className="table-dark">
          <tr>
            {CSV_COLUMNS.map((col) => (
              <th key={col} style={{ whiteSpace: "nowrap", padding: "0.4rem 0.6rem" }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i}>
              {CSV_COLUMNS.map((col) => (
                <td
                  key={col}
                  style={{
                    maxWidth: "160px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    padding: "0.35rem 0.6rem",
                  }}
                  title={row[col]}
                >
                  {row[col] || <span style={{ color: "#9ca3af" }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Result summary
// ---------------------------------------------------------------------------

interface ImportResultPanelProps {
  result: ImportResult;
}

const ImportResultPanel: React.FC<ImportResultPanelProps> = ({ result }) => {
  const { t } = useTranslation();

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Success banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          backgroundColor: result.imported > 0 ? "#ecfdf5" : "#fff7ed",
          border: `1px solid ${result.imported > 0 ? "#6ee7b7" : "#fdba74"}`,
          marginBottom: result.errors.length > 0 ? "1rem" : 0,
        }}
      >
        <FontAwesomeIcon
          icon={result.imported > 0 ? faCheckCircle : faExclamationTriangle}
          style={{ color: result.imported > 0 ? "#10b981" : "#f59e0b", flexShrink: 0 }}
          size="lg"
        />
        <span style={{ fontWeight: 600, color: "#1f2937" }}>
          {t("{{count}} product(s) imported successfully", { count: result.imported })}
          {result.errors.length > 0 &&
            `, ${result.errors.length} ${t("error(s)")}`}
        </span>
      </div>

      {/* Error list */}
      {result.errors.length > 0 && (
        <div
          style={{
            borderRadius: "0.5rem",
            border: "1px solid #fca5a5",
            backgroundColor: "#fff1f2",
            padding: "0.75rem 1rem",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem",
              fontWeight: 600,
              color: "#dc2626",
              fontSize: "0.85rem",
            }}
          >
            <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
            {t("Import errors")}
          </p>
          <table className="table table-sm" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: "60px" }}>{t("Row")}</th>
                <th>{t("Error")}</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((err, i) => (
                <tr key={i}>
                  <td style={{ color: "#dc2626", fontWeight: 600 }}>{err.row}</td>
                  <td>{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Column format hint
// ---------------------------------------------------------------------------

const ColumnFormatHint: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        backgroundColor: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: "0.5rem",
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
      }}
    >
      <p
        style={{
          margin: "0 0 0.4rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#0369a1",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {t("Expected CSV column order")}
      </p>
      <code
        style={{
          display: "block",
          fontSize: "0.78rem",
          color: "#1e3a5f",
          wordBreak: "break-all",
          lineHeight: 1.7,
        }}
      >
        {CSV_COLUMNS.join(", ")}
      </code>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ImportItems: React.FC = () => {
  const { t } = useTranslation();

  // Modal open state
  const [modalOpen, setModalOpen] = useState(false);

  // Drag-over visual feedback
  const [isDragging, setIsDragging] = useState(false);

  // Selected file metadata + parsed data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);

  // Phase controls what the modal body renders
  const [phase, setPhase] = useState<ImportPhase>("idle");

  // Upload result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setParsedRows([]);
    setPhase("idle");
    setImportResult(null);
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    resetState();
  }, [resetState]);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const { headers, rows } = parseCsv(raw);
      const mapped = mapRowsToCsvRows(headers, rows);
      setParsedRows(mapped);
      setPhase("preview");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setPhase("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await request(PRODUCT_UPLOAD, {
        method: "POST",
        body: formData,
      });

      // Try to parse a structured result; fall back to a generic success
      let result: ImportResult;
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.includes("application/json")) {
        const json = await response.json();
        result = {
          imported:
            typeof json.imported === "number"
              ? json.imported
              : parsedRows.length,
          errors: Array.isArray(json.errors) ? json.errors : [],
        };
      } else if (response.ok) {
        result = { imported: parsedRows.length, errors: [] };
      } else {
        // Non-2xx — treat the whole batch as failed
        let errMsg = `HTTP ${response.status}`;
        try {
          const json = await response.json();
          errMsg = json.detail ?? json.message ?? errMsg;
        } catch {
          // ignore parse error
        }
        result = {
          imported: 0,
          errors: [{ row: 0, message: errMsg }],
        };
      }

      setImportResult(result);
      setPhase("done");

      if (result.imported > 0) {
        notify({
          type: "success",
          title: t("Import complete"),
          description: t("{{count}} product(s) imported successfully", {
            count: result.imported,
          }),
        });
        window.dispatchEvent(new Event("products-changed"));
      } else {
        notify({
          type: "error",
          title: t("Import failed"),
          description: t("No products were imported. Check the error list."),
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("An unexpected error occurred");
      setImportResult({
        imported: 0,
        errors: [{ row: 0, message }],
      });
      setPhase("done");
      notify({
        type: "error",
        title: t("Import failed"),
        description: message,
      });
    }
  }, [selectedFile, parsedRows.length, t]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const modalTitle = (
    <span>
      <FontAwesomeIcon icon={faFileImport} className="me-2" />
      {t("Import Products from CSV")}
    </span>
  );

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="primary"
        type="button"
        onClick={() => setModalOpen(true)}
      >
        <FontAwesomeIcon icon={faUpload} className="me-2" />
        {t("Upload Items")}
      </Button>

      {/* Import modal */}
      <Modal
        open={modalOpen}
        onClose={handleClose}
        title={modalTitle}
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={true}
      >
        {/* ------------------------------------------------------------------ */}
        {/* PHASE: idle — show drop zone + format hint                          */}
        {/* ------------------------------------------------------------------ */}
        {(phase === "idle" || phase === "preview") && (
          <>
            <ColumnFormatHint />

            {/* Template download */}
            <div style={{ marginBottom: "1.25rem", textAlign: "right" }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={downloadTemplate}
              >
                <FontAwesomeIcon icon={faDownload} className="me-2" />
                {t("Download Template")}
              </Button>
            </div>

            {/* Drop zone */}
            <DropZone
              onFileSelected={handleFileSelected}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />

            {/* File info badge */}
            {selectedFile && (
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  color: "#374151",
                }}
              >
                <FontAwesomeIcon icon={faFileCsv} style={{ color: "#10b981" }} />
                <span style={{ fontWeight: 600 }}>{selectedFile.name}</span>
                <span style={{ color: "#6b7280" }}>
                  ({(selectedFile.size / 1024).toFixed(1)} KB,{" "}
                  {parsedRows.length} {t("rows")})
                </span>
                <button
                  type="button"
                  onClick={resetState}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    textDecoration: "underline",
                  }}
                >
                  {t("Change file")}
                </button>
              </div>
            )}

            {/* Preview table */}
            {phase === "preview" && parsedRows.length > 0 && (
              <PreviewTable rows={parsedRows} totalRows={parsedRows.length} />
            )}

            {/* No valid rows warning */}
            {phase === "preview" && parsedRows.length === 0 && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  color: "#92400e",
                  fontSize: "0.85rem",
                }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {t(
                  "No data rows found. Make sure your CSV has a header row followed by data."
                )}
              </div>
            )}

            {/* Action bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <Button type="button" variant="secondary" onClick={handleClose}>
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={phase !== "preview" || parsedRows.length === 0}
                onClick={handleImport}
              >
                <FontAwesomeIcon icon={faFileImport} className="me-2" />
                {t("Import {{count}} product(s)", { count: parsedRows.length })}
              </Button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHASE: uploading                                                    */}
        {/* ------------------------------------------------------------------ */}
        {phase === "uploading" && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1.5rem",
              color: "#6b7280",
            }}
          >
            {/* Spinner via CSS class — matches project's Bootstrap/Tailwind mix */}
            <div
              className="spinner-border text-primary"
              role="status"
              style={{ width: "3rem", height: "3rem" }}
            >
              <span className="visually-hidden">{t("Loading...")}</span>
            </div>
            <p style={{ marginTop: "1.25rem", fontWeight: 600, color: "#374151" }}>
              {t("Uploading and importing...")}
            </p>
            <p style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
              {t("Please wait while we process your file.")}
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHASE: done — show result summary                                   */}
        {/* ------------------------------------------------------------------ */}
        {phase === "done" && importResult !== null && (
          <>
            <ImportResultPanel result={importResult} />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <Button type="button" variant="secondary" onClick={resetState}>
                {t("Import another file")}
              </Button>
              <Button type="button" variant="primary" onClick={handleClose}>
                {t("Close")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};
