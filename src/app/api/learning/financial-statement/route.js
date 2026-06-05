import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';
const VALID_STATEMENTS = ['income', 'balance', 'cashflow'];

const STATEMENT_PATHS = {
  income: 'income-statement',
  balance: 'balance-sheet-statement',
  cashflow: 'cash-flow-statement',
};

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/**
 * GET /api/learning/financial-statement?symbol=AAPL&statement=income&period=annual&limit=2
 */
export const GET = withApiGuard(
  async (request, user) => {
    try {
      const url = new URL(req.url);
      const symbol = (url.searchParams.get('symbol') || '').toUpperCase().trim();
      const statement = url.searchParams.get('statement') || 'income';
      const period = url.searchParams.get('period') === 'quarter' ? 'quarter' : 'annual';
      const limit = Math.min(4, Math.max(2, Number(url.searchParams.get('limit')) || 2));

      if (!symbol || !VALID_STATEMENTS.includes(statement)) {
        return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
      }

      const apiKey = getFmpKey();
      if (!apiKey) {
        return NextResponse.json({ error: 'FMP service unavailable' }, { status: 503 });
      }

      const path = STATEMENT_PATHS[statement];
      const fmpUrl = `${FMP_BASE}/${path}/${symbol}?period=${period}&limit=${limit}&apikey=${apiKey}`;
      const res = await fetch(fmpUrl, { cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ error: `FMP HTTP ${res.status}` }, { status: res.status });
      }

      const raw = await res.json();
      if (!Array.isArray(raw) || raw.length === 0) {
        return NextResponse.json({ error: 'No data returned' }, { status: 404 });
      }

      const periods = raw.slice(0, limit).map((p) => ({
        label: period === 'annual' ? p.calendarYear : `${p.period} ${p.calendarYear}`,
        date: p.date,
      }));

      const rows = buildRows(statement, raw);

      return NextResponse.json({
        symbol,
        statement,
        period,
        periods,
        rows,
      });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  },
  { requireAuth: false },
);

function buildRows(statement, raw) {
  const layouts = {
    income: [
      { label: 'Revenue', key: 'revenue', indent: 0, isTotal: false },
      { label: 'Cost of Revenue', key: 'costOfRevenue', indent: 1, isTotal: false },
      { label: 'Gross Profit', key: 'grossProfit', indent: 0, isSubtotal: true },
      { label: 'Operating Expenses', key: 'operatingExpenses', indent: 1, isTotal: false },
      {
        label: 'Research & Development',
        key: 'researchAndDevelopmentExpenses',
        indent: 1,
        isTotal: false,
      },
      {
        label: 'Selling, General & Admin',
        key: 'sellingGeneralAndAdministrativeExpenses',
        indent: 1,
        isTotal: false,
      },
      { label: 'Operating Income', key: 'operatingIncome', indent: 0, isSubtotal: true },
      { label: 'Interest Expense', key: 'interestExpense', indent: 1, isTotal: false },
      { label: 'Income Before Tax', key: 'incomeBeforeTax', indent: 0, isSubtotal: true },
      { label: 'Income Tax Expense', key: 'incomeTaxExpense', indent: 1, isTotal: false },
      { label: 'Net Income', key: 'netIncome', indent: 0, isTotal: true },
      { label: 'EPS (Diluted)', key: 'epsdiluted', indent: 0, isEps: true },
    ],
    balance: [
      { label: 'ASSETS', key: '_header_assets', indent: 0, isHeader: true },
      { label: 'Cash & Equivalents', key: 'cashAndCashEquivalents', indent: 1 },
      { label: 'Short-term Investments', key: 'shortTermInvestments', indent: 1 },
      { label: 'Net Receivables', key: 'netReceivables', indent: 1 },
      { label: 'Inventory', key: 'inventory', indent: 1 },
      { label: 'Total Current Assets', key: 'totalCurrentAssets', indent: 0, isSubtotal: true },
      { label: 'Property, Plant & Equipment', key: 'propertyPlantEquipmentNet', indent: 1 },
      { label: 'Goodwill', key: 'goodwill', indent: 1 },
      { label: 'Intangible Assets', key: 'intangibleAssets', indent: 1 },
      { label: 'Long-term Investments', key: 'longTermInvestments', indent: 1 },
      {
        label: 'Total Non-Current Assets',
        key: 'totalNonCurrentAssets',
        indent: 0,
        isSubtotal: true,
      },
      { label: 'Total Assets', key: 'totalAssets', indent: 0, isTotal: true },
      { label: 'LIABILITIES', key: '_header_liabilities', indent: 0, isHeader: true },
      { label: 'Accounts Payable', key: 'accountPayables', indent: 1 },
      { label: 'Short-term Debt', key: 'shortTermDebt', indent: 1 },
      {
        label: 'Total Current Liabilities',
        key: 'totalCurrentLiabilities',
        indent: 0,
        isSubtotal: true,
      },
      { label: 'Long-term Debt', key: 'longTermDebt', indent: 1 },
      {
        label: 'Total Non-Current Liabilities',
        key: 'totalNonCurrentLiabilities',
        indent: 0,
        isSubtotal: true,
      },
      { label: 'Total Liabilities', key: 'totalLiabilities', indent: 0, isTotal: true },
      { label: 'EQUITY', key: '_header_equity', indent: 0, isHeader: true },
      { label: 'Retained Earnings', key: 'retainedEarnings', indent: 1 },
      { label: 'Common Stock', key: 'commonStock', indent: 1 },
      {
        label: 'Total Stockholders Equity',
        key: 'totalStockholdersEquity',
        indent: 0,
        isTotal: true,
      },
    ],
    cashflow: [
      { label: 'OPERATING ACTIVITIES', key: '_header_op', indent: 0, isHeader: true },
      { label: 'Net Income', key: 'netIncome', indent: 1 },
      { label: 'Depreciation & Amortization', key: 'depreciationAndAmortization', indent: 1 },
      { label: 'Stock-Based Compensation', key: 'stockBasedCompensation', indent: 1 },
      { label: 'Change in Working Capital', key: 'changeInWorkingCapital', indent: 1 },
      {
        label: 'Cash from Operations',
        key: 'netCashProvidedByOperatingActivities',
        indent: 0,
        isSubtotal: true,
      },
      { label: 'INVESTING ACTIVITIES', key: '_header_inv', indent: 0, isHeader: true },
      { label: 'Capital Expenditure', key: 'capitalExpenditure', indent: 1 },
      { label: 'Acquisitions Net', key: 'acquisitionsNet', indent: 1 },
      {
        label: 'Cash from Investing',
        key: 'netCashUsedForInvestingActivites',
        indent: 0,
        isSubtotal: true,
      },
      { label: 'FINANCING ACTIVITIES', key: '_header_fin', indent: 0, isHeader: true },
      { label: 'Debt Repayment', key: 'debtRepayment', indent: 1 },
      { label: 'Common Stock Repurchased', key: 'commonStockRepurchased', indent: 1 },
      { label: 'Dividends Paid', key: 'dividendsPaid', indent: 1 },
      {
        label: 'Cash from Financing',
        key: 'netCashUsedProvidedByFinancingActivities',
        indent: 0,
        isSubtotal: true,
      },
      { label: 'Free Cash Flow', key: 'freeCashFlow', indent: 0, isTotal: true },
    ],
  };

  const layout = layouts[statement] || layouts.income;

  return layout.map((rowDef) => {
    if (rowDef.isHeader) {
      return { ...rowDef, values: [] };
    }
    const values = raw.map((p) => {
      const v = p?.[rowDef.key];
      return typeof v === 'number' ? v : null;
    });
    return { ...rowDef, values };
  });
}
