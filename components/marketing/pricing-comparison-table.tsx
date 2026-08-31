function Dash() {
  return <span className="text-slate-300">—</span>
}

function Check() {
  return (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

type Cell = boolean | string

interface Row {
  feature: string
  // Keyed by the underlying Plan.id ('standard'/'pro'), not necessarily
  // matching column order intuition — see lib/billing/plans.ts for the
  // 2026-07-29 id rename (old id 'pro' -> 'standard', old id 'scale' -> 'pro').
  standard: Cell
  pro: Cell
  enterprise: Cell
}

const ROWS: Row[] = [
  { feature: 'AI deflections / month', standard: '500', pro: '3,000', enterprise: 'Unlimited' },
  { feature: 'Usage beyond the monthly limit', standard: 'Hard cap', pro: '$5 per 100', enterprise: '—' },
  { feature: 'Discord, Slack, Discourse, Circle, GitHub, Telegram, Email, Google Chat', standard: true, pro: true, enterprise: true },
  { feature: 'Website chat widget + lead capture', standard: true, pro: true, enterprise: true },
  { feature: 'Knowledge base (upload, URL, GitHub sync)', standard: true, pro: true, enterprise: true },
  { feature: 'Bring your own AI provider', standard: true, pro: true, enterprise: true },
  { feature: 'MCP server + REST Agent API', standard: true, pro: true, enterprise: true },
  { feature: 'MCP / Agent API rate limit', standard: '50 req/min', pro: '150 req/min', enterprise: '300 req/min' },
  { feature: 'Multi-language AI responses', standard: true, pro: true, enterprise: true },
  { feature: 'CSV export', standard: true, pro: true, enterprise: true },
  { feature: 'White-label widget (remove branding)', standard: true, pro: true, enterprise: true },
  { feature: 'CSAT scoring', standard: false, pro: true, enterprise: true },
  { feature: 'Human escalation routing', standard: false, pro: true, enterprise: true },
  { feature: 'Simulation / dry-run mode', standard: false, pro: true, enterprise: true },
  { feature: 'Knowledge gap dashboard', standard: false, pro: true, enterprise: true },
  { feature: 'Priority support', standard: false, pro: true, enterprise: true },
  { feature: 'Custom AI model configuration', standard: false, pro: false, enterprise: true },
  { feature: 'Unlimited data retention', standard: false, pro: false, enterprise: true },
  { feature: 'White-glove migration off Zendesk/Intercom/Confluence', standard: false, pro: false, enterprise: true },
  { feature: 'SLA + automatic breach alerting', standard: false, pro: false, enterprise: true },
  { feature: 'Custom invoicing', standard: false, pro: false, enterprise: true },
]

function CellValue({ value }: { value: Cell }) {
  if (typeof value === 'string') return <span className="text-xs font-semibold text-slate-800">{value}</span>
  return value ? <Check /> : <Dash />
}

export function PricingComparisonTable() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_20px_65px_rgba(30,64,175,0.07)]">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            <th className="w-[42%] px-6 py-5 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-slate-500">Feature</th>
            <th className="px-4 py-5 text-center text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-slate-500">Standard</th>
            <th className="border-x border-blue-100 bg-blue-50/70 px-4 py-5 text-center text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-blue-700">Pro</th>
            <th className="px-4 py-5 text-center text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-slate-500">Enterprise</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ROWS.map((row, index) => (
            <tr key={row.feature} className={`transition-colors hover:bg-slate-50/80 ${index === 0 ? 'bg-slate-50/35' : 'bg-white'}`}>
              <td className="px-6 py-4 text-sm font-medium text-slate-700">{row.feature}</td>
              <td className="px-4 py-4 text-center"><CellValue value={row.standard} /></td>
              <td className="border-x border-blue-100/80 bg-blue-50/35 px-4 py-4 text-center"><CellValue value={row.pro} /></td>
              <td className="px-4 py-4 text-center"><CellValue value={row.enterprise} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="flex flex-col items-start gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-4 text-[0.625rem] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Scroll horizontally on smaller screens</span>
        <span className="font-semibold text-blue-700">All plans include BYO AI provider</span>
      </div>
    </div>
  )
}
