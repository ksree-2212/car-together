import type { LineItem } from "@/lib/schemas";

export function reconcile(quoteLines: LineItem[], invoiceLines: LineItem[]) {
  const quoteTotals = totalsByCategory(quoteLines);
  const invoiceTotals = totalsByCategory(invoiceLines);
  const categories = Array.from(new Set([...quoteTotals.keys(), ...invoiceTotals.keys()])).sort();
  const categoryDifferences = categories.map((category) => {
    const quotedPaise = quoteTotals.get(category) ?? 0;
    const invoicedPaise = invoiceTotals.get(category) ?? 0;
    return { category, quotedPaise, invoicedPaise, differencePaise: invoicedPaise - quotedPaise };
  });
  const quotedTotalPaise = quoteLines.reduce((sum, line) => sum + (line.kind === "discount" ? -line.amountPaise : line.amountPaise), 0);
  const invoicedTotalPaise = invoiceLines.reduce((sum, line) => sum + (line.kind === "discount" ? -line.amountPaise : line.amountPaise), 0);
  return {
    quotedTotalPaise, invoicedTotalPaise, differencePaise: invoicedTotalPaise - quotedTotalPaise,
    categoryDifferences,
    note: "This comparison uses the line items you entered. It does not verify uploaded documents or prove that either total is complete.",
  };
}

function totalsByCategory(lines: LineItem[]) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const net = line.kind === "discount" ? -line.amountPaise : line.amountPaise;
    totals.set(line.category, (totals.get(line.category) ?? 0) + net);
  }
  return totals;
}
