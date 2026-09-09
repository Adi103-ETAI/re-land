export const chartData = {
  processed: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [6200, 7400, 8650, 9800, 11200, 12846] },
  validation: { labels: ["Validated", "Pending review", "Failed"], values: [76, 17, 7] },
  state: { labels: ["Maharashtra", "Karnataka", "Gujarat", "Rajasthan"], values: [86, 78, 69, 62] },
  errorCats: { labels: ["Poor image quality", "Handwriting", "Language", "Missing data", "Duplicate", "DB mismatch"], values: [28, 22, 14, 16, 11, 9] },
  kpis: { total: 14320, processed: 12846, verified: 9820, pending: 247, issues: 473, avgConf: "91.2%" },
  funnel: [
    { label: "Uploaded", value: 14320 },
    { label: "OCR Processed", value: 13340 },
    { label: "AI Extracted", value: 12846 },
    { label: "Validated", value: 10856 },
    { label: "Verified", value: 9820 },
  ],
};
