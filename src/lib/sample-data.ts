import type { ParsedData } from "@/lib/file-parsers";

export const SAMPLE_DATASET: ParsedData = {
  columns: ["Month", "Revenue", "Expenses", "Category", "Region"],
  rows: [
    { Month: "2025-01", Revenue: "12400", Expenses: "8200", Category: "Electronics", Region: "North" },
    { Month: "2025-02", Revenue: "15800", Expenses: "9100", Category: "Clothing", Region: "South" },
    { Month: "2025-03", Revenue: "11200", Expenses: "7600", Category: "Electronics", Region: "East" },
    { Month: "2025-04", Revenue: "18900", Expenses: "10300", Category: "Food", Region: "West" },
    { Month: "2025-05", Revenue: "22100", Expenses: "12500", Category: "Electronics", Region: "North" },
    { Month: "2025-06", Revenue: "19700", Expenses: "11800", Category: "Clothing", Region: "South" },
    { Month: "2025-07", Revenue: "25300", Expenses: "14200", Category: "Food", Region: "East" },
    { Month: "2025-08", Revenue: "21800", Expenses: "13100", Category: "Electronics", Region: "West" },
    { Month: "2025-09", Revenue: "17600", Expenses: "10900", Category: "Clothing", Region: "North" },
    { Month: "2025-10", Revenue: "28400", Expenses: "15700", Category: "Food", Region: "South" },
    { Month: "2025-11", Revenue: "31200", Expenses: "17400", Category: "Electronics", Region: "East" },
    { Month: "2025-12", Revenue: "34500", Expenses: "19200", Category: "Clothing", Region: "West" },
    { Month: "2025-01", Revenue: "9800", Expenses: "6500", Category: "Food", Region: "North" },
    { Month: "2025-02", Revenue: "14200", Expenses: "8800", Category: "Electronics", Region: "South" },
    { Month: "2025-03", Revenue: "16700", Expenses: "9900", Category: "Clothing", Region: "East" },
    { Month: "2025-04", Revenue: "20100", Expenses: "11600", Category: "Food", Region: "West" },
    { Month: "2025-05", Revenue: "23500", Expenses: "13800", Category: "Electronics", Region: "North" },
    { Month: "2025-06", Revenue: "18300", Expenses: "10500", Category: "Clothing", Region: "South" },
    { Month: "2025-07", Revenue: "27600", Expenses: "15100", Category: "Food", Region: "East" },
    { Month: "2025-08", Revenue: "24900", Expenses: "14600", Category: "Electronics", Region: "West" },
  ],
  totalRows: 20,
};

export const SAMPLE_DATASET_NAME = "Sample Sales Dataset";
