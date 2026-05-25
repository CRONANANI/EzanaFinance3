export default {
  'stocks-intermediate-3': {
    sections: [
      {
        title: 'Why the three statements exist',
        shortTitle: 'Why three statements',
        estimatedMinutes: 4,
        modules: [
          {
            type: 'paragraphs',
            body: 'Every public company publishes three core financial statements every quarter and every year: the **income statement**, the **balance sheet**, and the **cash flow statement**. Each answers a different question. The income statement tells you whether the business made money over a period of time. The balance sheet tells you what the business owns and owes at a single point in time. The cash flow statement tells you where cash actually moved during the period — which is not the same thing as profit.',
          },
          {
            type: 'paragraphs',
            body: "Reading all three together gives a complete picture. Reading one alone almost always misleads. A company can report a giant profit on the income statement while burning cash on the cash flow statement. It can have huge assets on the balance sheet while none of them are productive. Each statement exists because there's something the others can't show you.",
          },
          {
            type: 'pullQuote',
            body: '**Revenue is vanity. Profit is sanity. Cash is reality.** The three statements together force you to confront all three at once.',
            caption: 'A useful accounting maxim',
          },
          {
            type: 'paragraphs',
            body: "Throughout this course we'll use a real company — [[ticker:AAPL]]Apple[[/ticker]] — to walk through what each statement looks like in practice. Apple is large enough that the numbers are easy to find, conservative enough that the statements aren't full of unusual items, and recognizable enough that the lessons stick.",
          },
        ],
      },
      {
        title: 'The income statement',
        shortTitle: 'Income statement',
        estimatedMinutes: 8,
        modules: [
          {
            type: 'paragraphs',
            body: "The income statement (sometimes called the **profit and loss statement** or **P&L**) measures a company's profit over a defined period — usually a quarter or a year. It starts with the money the company brought in and subtracts every type of cost until you arrive at net income at the bottom. This top-to-bottom structure is why people refer to revenue as the **top line** and net income as the **bottom line**.",
          },
          {
            type: 'paragraphs',
            body: "The basic structure is consistent across companies: **Revenue → Cost of Revenue → Gross Profit → Operating Expenses → Operating Income → Taxes & Interest → Net Income**. Each step strips out a different category of cost. Gross profit shows what's left after the direct cost of making the product. Operating income shows what's left after running the business (R&D, sales, admin). Net income shows what's left after everything — including taxes and interest.",
          },
          {
            type: 'financialStatement',
            symbol: 'AAPL',
            statement: 'income',
            period: 'annual',
            limit: 2,
            eyebrow: 'Live example',
            caption:
              "Apple's most recent two fiscal years. The YoY column shows the year-over-year change. Notice how revenue, gross profit, operating income, and net income all change at different rates — operating leverage at work.",
          },
          {
            type: 'paragraphs',
            body: "Look at the YoY column closely. Even when revenue grows modestly, profit can grow much faster if operating expenses grow more slowly. That spread is called **operating leverage**. The opposite is also true: when revenue shrinks, profit shrinks faster, because the fixed-cost portion of operating expenses doesn't shrink with it.",
          },
          {
            type: 'paragraphs',
            body: 'Pay attention to **earnings per share (EPS)** at the bottom. EPS is net income divided by the number of shares outstanding. Companies that buy back stock reduce the share count, which mechanically increases EPS even without growing net income. That makes EPS growth a useful number to compare to net-income growth — if EPS is growing faster than net income, buybacks are doing the work.',
          },
          {
            type: 'keyTermCards',
            eyebrow: 'Key terms · income statement',
            pillLabel: '5 new',
            terms: [
              {
                name: 'Revenue',
                color: 'blue',
                definition:
                  'Total money the company collected from selling its products or services during the period. Also called sales or "the top line."',
              },
              {
                name: 'Gross profit',
                color: 'green',
                definition:
                  'Revenue minus the direct cost of making the product (cost of revenue or COGS). Shows the profitability of the product itself, before factoring in any overhead.',
              },
              {
                name: 'Operating income',
                color: 'amber',
                definition:
                  'Gross profit minus operating expenses (R&D, sales, general admin). Measures how much the business produces from its core operations, before interest and taxes.',
              },
              {
                name: 'Net income',
                color: 'red',
                definition:
                  'Profit after every cost — operating, interest, and taxes. Also called the "bottom line." This is what flows to shareholders.',
              },
              {
                name: 'EPS (Earnings Per Share)',
                color: 'violet',
                definition:
                  'Net income divided by shares outstanding. The portion of profit attributable to each share. Diluted EPS includes the dilutive effect of stock options and convertible securities.',
              },
            ],
          },
        ],
      },
      {
        title: 'The balance sheet',
        shortTitle: 'Balance sheet',
        estimatedMinutes: 8,
        modules: [
          {
            type: 'paragraphs',
            body: 'The balance sheet is a snapshot — it shows what the company owns and owes at a single point in time, usually the last day of the quarter or fiscal year. Unlike the income statement, which measures a period, the balance sheet measures a moment.',
          },
          {
            type: 'paragraphs',
            body: 'The fundamental equation is: **Assets = Liabilities + Equity**. Everything the company controls (assets) is either funded by money it owes others (liabilities) or by money the shareholders have put in or left in the business (equity). The two sides always balance. That equation is the source of the name.',
          },
          {
            type: 'financialStatement',
            symbol: 'AAPL',
            statement: 'balance',
            period: 'annual',
            limit: 2,
            eyebrow: 'Live example',
            caption:
              "Apple's balance sheet. Notice the three sections: Assets, Liabilities, Equity. Total Assets always equals Total Liabilities + Total Stockholders Equity.",
          },
          {
            type: 'paragraphs',
            body: 'Within assets, items are split into **current** (convertible to cash within a year — receivables, inventory, short-term investments) and **non-current** (longer-lived items — property, plant and equipment, goodwill, long-term investments). Liabilities follow the same split: **current liabilities** are debts due within a year; **non-current liabilities** are longer-dated debt.',
          },
          {
            type: 'paragraphs',
            body: 'The relationship between current assets and current liabilities is one of the most important ratios in finance: the **current ratio** (current assets ÷ current liabilities) measures whether a company can pay its near-term obligations from its near-term resources. A ratio above 1 means it can; below 1 raises a question. The **quick ratio** is a stricter version that excludes inventory — it asks whether the company can pay debts with only its most liquid assets.',
          },
          {
            type: 'paragraphs',
            body: "On the equity side, **retained earnings** is the accumulated profit from every period in the company's history, minus all the dividends ever paid out. It is, in effect, profit reinvested into the business. A company with large retained earnings has been profitable for a long time and has not returned all of it to shareholders.",
          },
          {
            type: 'keyTermCards',
            eyebrow: 'Key terms · balance sheet',
            pillLabel: '5 new',
            terms: [
              {
                name: 'Assets',
                color: 'blue',
                definition:
                  'Economic resources the company controls. Current assets (cash, receivables, inventory) convert to cash within a year. Non-current assets (property, equipment, goodwill) are longer-lived.',
              },
              {
                name: 'Liabilities',
                color: 'red',
                definition:
                  'Money the company owes. Current liabilities (accounts payable, short-term debt) are due within a year. Non-current liabilities (long-term debt) are due later.',
              },
              {
                name: 'Stockholders equity',
                color: 'green',
                definition:
                  'What would remain for shareholders if every asset were sold at book value and every liability paid off. Equals total assets minus total liabilities.',
              },
              {
                name: 'Current ratio',
                color: 'amber',
                definition:
                  'Current assets divided by current liabilities. Measures short-term liquidity — whether the company can pay near-term obligations from near-term resources.',
              },
              {
                name: 'Retained earnings',
                color: 'violet',
                definition:
                  'Cumulative profit the company has earned across its entire history, minus all dividends ever paid out. Profit reinvested rather than returned to shareholders.',
              },
            ],
          },
        ],
      },
      {
        title: 'The cash flow statement',
        shortTitle: 'Cash flow statement',
        estimatedMinutes: 8,
        modules: [
          {
            type: 'paragraphs',
            body: "The cash flow statement tracks actual cash movement during the period. This sounds redundant with the income statement, but it isn't. The income statement is built on **accrual accounting** — revenue is recognized when earned, costs are recognized when incurred, regardless of when cash actually changes hands. The cash flow statement strips out all those timing assumptions and shows what really moved in and out of the bank account.",
          },
          {
            type: 'paragraphs',
            body: "A company can report a profit on the income statement while losing cash, or vice versa. A subscription business might book a year of revenue up front (high reported profit) while collecting cash slowly (low operating cash). A company that builds inventory before a big shipment might report low profit (the inventory hasn't been sold) while still seeing strong cash if customers pre-paid. The cash flow statement makes these gaps visible.",
          },
          {
            type: 'paragraphs',
            body: 'The statement is divided into three sections. **Operating activities** is cash generated or used by the core business. **Investing activities** is cash spent on or received from buying/selling long-term assets (the big one is **capital expenditure** — money spent on property, equipment, software). **Financing activities** is cash from issuing or repaying debt, issuing stock, repurchasing stock, or paying dividends.',
          },
          {
            type: 'financialStatement',
            symbol: 'AAPL',
            statement: 'cashflow',
            period: 'annual',
            limit: 2,
            eyebrow: 'Live example',
            caption:
              "Apple's cash flow statement. Notice how net income at the top differs from operating cash flow below — depreciation and working-capital changes are the biggest reconciling items.",
          },
          {
            type: 'paragraphs',
            body: "The most important number on the cash flow statement is **free cash flow (FCF)**: cash from operations minus capital expenditure. FCF measures how much cash the business throws off after paying for everything required to keep operating. It's the cash available to repay debt, buy back stock, pay dividends, or make acquisitions — anything that creates shareholder value. Many investors consider FCF a better measure of business quality than net income because it strips out accounting choices.",
          },
          {
            type: 'paragraphs',
            body: 'Watch the **depreciation and amortization** line near the top of the operating section. Depreciation is a non-cash expense — it represents the wearing-out of long-term assets over time, but no actual cash is spent. So it gets ADDED BACK to net income when calculating operating cash flow. A company with heavy property, plant, and equipment (think utilities, telecoms, manufacturers) will report much higher operating cash flow than net income because of this addback.',
          },
          {
            type: 'keyTermCards',
            eyebrow: 'Key terms · cash flow statement',
            pillLabel: '5 new',
            terms: [
              {
                name: 'Operating cash flow',
                color: 'green',
                definition:
                  'Cash generated or used by the core business operations during the period. Reconciles net income to actual cash by adding back non-cash expenses and adjusting for working-capital changes.',
              },
              {
                name: 'Capital expenditure (CapEx)',
                color: 'blue',
                definition:
                  'Cash spent on long-term assets like property, equipment, software, or facilities. Investment in the productive capacity of the business.',
              },
              {
                name: 'Free cash flow (FCF)',
                color: 'amber',
                definition:
                  'Operating cash flow minus capital expenditure. The cash actually available after paying everything required to maintain operations. Often used as the truest measure of business profitability.',
              },
              {
                name: 'Depreciation & amortization',
                color: 'violet',
                definition:
                  'A non-cash expense that allocates the cost of long-term assets over their useful life. Reduces net income but not cash — so it gets added back when computing operating cash flow.',
              },
              {
                name: 'Working capital',
                color: 'red',
                definition:
                  'Current assets minus current liabilities. Changes in working capital (receivables, inventory, payables) flow through operating cash flow because they tie up or release cash.',
              },
            ],
          },
        ],
      },
      {
        title: 'How the three statements connect',
        shortTitle: 'Three-statement linkage',
        estimatedMinutes: 5,
        modules: [
          {
            type: 'paragraphs',
            body: 'The three statements are not independent. They are three views of the same business, linked through a small number of specific lines. Understanding these links is the difference between reading financials and understanding them.',
          },
          {
            type: 'paragraphs',
            body: '**The first link**: net income on the income statement is the starting line of operating cash flow on the cash flow statement. The cash flow statement starts with net income and then adjusts it back to actual cash by adding back non-cash expenses (depreciation, stock-based compensation) and accounting for working-capital changes.',
          },
          {
            type: 'paragraphs',
            body: '**The second link**: net income also flows into retained earnings on the balance sheet. Each period, retained earnings increases by net income and decreases by any dividends paid out. Over time, retained earnings is the accumulated profit a company has kept rather than returned to shareholders.',
          },
          {
            type: 'paragraphs',
            body: "**The third link**: the ending cash balance on the cash flow statement equals the cash line on the balance sheet. The cash flow statement shows you how cash got from last period's balance to this period's — all three operating, investing, and financing activities sum to the net change in cash.",
          },
          {
            type: 'pullQuote',
            body: 'If you can trace **net income → retained earnings**, **net income → operating cash flow**, and **net change in cash → balance sheet cash**, you understand how the three statements link.',
            caption: 'The three connections that tie it together',
          },
          {
            type: 'paragraphs',
            body: "This is why financial-modeling work always builds the three statements together rather than in isolation. Change one assumption — say, revenue growth — and the effects ripple. Revenue change moves net income (income statement), which moves operating cash flow (cash flow statement), which moves the cash balance (balance sheet), which moves the next period's opening cash. A model that gets these links right will balance; a model that gets them wrong will not.",
          },
        ],
      },
      {
        title: 'A real-world walkthrough: Apple',
        shortTitle: 'AAPL walkthrough',
        estimatedMinutes: 8,
        modules: [
          {
            type: 'paragraphs',
            body: "Let's read [[ticker:AAPL]]Apple[[/ticker]]'s three statements together and see what story they tell. Start with the income statement: notice how revenue, gross profit, and operating income each grow at slightly different rates. The spread between them is operating leverage — when revenue grows faster than fixed costs, profit grows even faster.",
          },
          {
            type: 'financialStatement',
            symbol: 'AAPL',
            statement: 'income',
            period: 'annual',
            limit: 3,
            eyebrow: 'Three-year view',
            caption:
              "Three years of Apple's income statement. Read the trends, not just the absolute numbers.",
          },
          {
            type: 'paragraphs',
            body: 'Now look at the balance sheet. Apple carries an enormous cash and investment position — historically more than $150 billion in cash and marketable securities. That gives the business flexibility to invest, repurchase stock, weather downturns, and acquire targets without taking on debt.',
          },
          {
            type: 'financialStatement',
            symbol: 'AAPL',
            statement: 'balance',
            period: 'annual',
            limit: 3,
            eyebrow: 'Three-year view',
            caption:
              "Three years of Apple's balance sheet. Watch how cash, total assets, and total stockholders equity evolve — and how the company has reduced its share count via buybacks.",
          },
          {
            type: 'paragraphs',
            body: 'Finally the cash flow statement. Apple is the textbook example of a business generating far more cash than it needs to operate. The gap between operating cash flow and net income is partly depreciation (small) and partly working-capital efficiency (the business collects cash faster than it pays suppliers). CapEx is modest relative to scale. Free cash flow is the result.',
          },
          {
            type: 'financialStatement',
            symbol: 'AAPL',
            statement: 'cashflow',
            period: 'annual',
            limit: 3,
            eyebrow: 'Three-year view',
            caption:
              "Apple's cash flow statement. Most of the free cash flow has historically gone to share buybacks and dividends — a deliberate capital-return strategy.",
          },
          {
            type: 'paragraphs',
            body: "Looking at all three together: Apple makes a lot of money, holds a fortress balance sheet, generates more cash than it can reinvest, and returns the excess to shareholders. That's not just three separate facts — it's one coherent picture only visible by reading the statements together.",
          },
        ],
      },
      {
        title: 'Common pitfalls when reading financials',
        shortTitle: 'Common pitfalls',
        estimatedMinutes: 5,
        modules: [
          {
            type: 'paragraphs',
            body: 'Now that you know how the three statements fit together, here are the most common mistakes that trip up readers — including experienced ones.',
          },
          {
            type: 'paragraphs',
            body: '**Trusting headline net income too much**. Reported net income can be distorted by one-time items: gains or losses from asset sales, restructuring charges, tax adjustments, accounting changes. Always look at the income statement bottom-up to see what was operating vs. one-off. Many companies report **non-GAAP** numbers (adjusted EPS, adjusted EBITDA) precisely because they want to highlight the underlying business excluding these noise items.',
          },
          {
            type: 'paragraphs',
            body: "**Ignoring stock-based compensation**. SBC is a real cost — it dilutes existing shareholders — but it doesn't reduce cash, so it gets added back to operating cash flow. Many tech companies report large operating cash flows partly because of this. Always check how much of operating cash flow is just SBC being added back. If you subtract SBC from operating cash flow, you get a more conservative measure of cash profitability.",
          },
          {
            type: 'paragraphs',
            body: '**Confusing revenue growth with profit growth**. Revenue can grow quickly while margins compress, leaving profit flat or down. The ratio of revenue growth to net income growth (or operating income growth) tells you whether the business is becoming more or less profitable as it scales.',
          },
          {
            type: 'paragraphs',
            body: "**Missing the working-capital story**. A business that's growing rapidly often has to invest in working capital — building inventory, extending credit to customers — which can drain operating cash flow even when profit is strong. The opposite is also true: a business with negative working capital (collecting from customers before paying suppliers) generates cash AHEAD of profit.",
          },
          {
            type: 'paragraphs',
            body: "**Not adjusting for share count**. A company can grow net income by 10% while growing EPS by 15% via buybacks. Conversely, a company can grow net income while EPS goes nowhere because it's been issuing stock. Always check both.",
          },
          {
            type: 'callout',
            body: 'Practice: pull up any company you follow and answer three questions. (1) Is revenue growing faster, in line with, or slower than net income? (2) How much of operating cash flow is just stock-based compensation? (3) What is free cash flow as a percentage of net income — and what does that tell you?',
          },
        ],
      },
      {
        title: 'Putting it all together',
        shortTitle: 'Synthesis',
        estimatedMinutes: 4,
        modules: [
          {
            type: 'paragraphs',
            body: 'You now have the three lenses you need to evaluate any public company: the income statement (did they make money), the balance sheet (what do they own and owe), the cash flow statement (where did cash actually go). Together they answer the central questions of business analysis.',
          },
          {
            type: 'paragraphs',
            body: "The most valuable skill you can build from here is reading these statements **together, not separately**. A great quarter is great revenue growth AND expanding margins AND strong cash conversion. A worrying quarter is fine net income but deteriorating cash flow. A misleading quarter is profit driven by a one-time gain that won't repeat next period.",
          },
          {
            type: 'paragraphs',
            body: "Every public-company filing — 10-K (annual) and 10-Q (quarterly) — contains all three statements plus management's commentary on what's behind the numbers. Reading that commentary alongside the statements is where intermediate-level financial analysis lives. The numbers tell you WHAT happened; the commentary tells you WHY.",
          },
          {
            type: 'paragraphs',
            body: "When you're ready to go deeper, the next step is **ratio analysis** — combining numbers across the three statements to build measurements of profitability (return on equity, return on invested capital), efficiency (asset turnover, inventory days), leverage (debt-to-equity, interest coverage), and valuation (P/E, EV/EBITDA, P/FCF). Each ratio asks a specific question about the business. With the foundation you have now, those ratios will mean something instead of being abstract.",
          },
        ],
      },
    ],
    quiz: [],
  },
};
