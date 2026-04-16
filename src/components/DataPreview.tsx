import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/file-parsers";

const PAGE_SIZE = 10;

interface DataPreviewProps {
  parsed: ParsedData;
}

const DataPreview = ({ parsed }: DataPreviewProps) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(parsed.rows.length / PAGE_SIZE);
  const pageRows = parsed.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (parsed.rows.length === 0) return null;

  return (
    <div className="glass rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Data Preview</h3>
          <span className="text-xs text-muted-foreground">
            ({parsed.totalRows.toLocaleString()} rows · {parsed.columns.length} columns)
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              {page + 1} / {totalPages}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-border/30">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
              {parsed.columns.map((col) => (
                <th key={col} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{page * PAGE_SIZE + i + 1}</td>
                {parsed.columns.map((col) => (
                  <td key={col} className="px-4 py-2.5 text-foreground font-mono text-xs max-w-[200px] truncate">{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataPreview;
