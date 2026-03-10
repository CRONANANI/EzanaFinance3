import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create a client-side Supabase client for auth
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    // Get the authorization header or cookies
    const authHeader = request.headers.get('authorization');
    let userId = null;

    // Try to get user from auth header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // If no auth header, try to get from cookies
    if (!userId) {
      const cookieStore = cookies();
      const supabaseCookies = cookieStore.getAll();

      // Find the access token cookie
      const accessTokenCookie = supabaseCookies.find(
        cookie => cookie.name.includes('auth-token') ||
                  cookie.name.includes('access-token') ||
                  cookie.name === 'sb-access-token'
      );

      if (accessTokenCookie) {
        const { data: { user }, error } = await supabaseAuth.auth.getUser(accessTokenCookie.value);
        if (user) {
          userId = user.id;
        }
      }
    }

    // If still no user, try getting session from Supabase directly
    if (!userId) {
      const { createServerClient } = await import('@supabase/ssr');
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll() {},
          },
        }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // For development/testing: if still no user, check if there's a user_id query param
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('user_id');
    if (!userId && queryUserId) {
      userId = queryUserId;
    }

    if (!userId) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    console.log('Fetching portfolio for user:', userId);

    // Use admin client to bypass RLS and fetch data
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('plaid_accounts')
      .select('*')
      .eq('user_id', userId);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: accountsError.message },
        { status: 500 }
      );
    }

    console.log('Found accounts:', accounts?.length || 0);

    // Fetch holdings
    const { data: holdings, error: holdingsError } = await supabaseAdmin
      .from('plaid_holdings')
      .select('*')
      .eq('user_id', userId);

    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
      return NextResponse.json(
        { error: 'Failed to fetch holdings', details: holdingsError.message },
        { status: 500 }
      );
    }

    console.log('Found holdings:', holdings?.length || 0);

    // Fetch securities
    const { data: securities, error: securitiesError } = await supabaseAdmin
      .from('plaid_securities')
      .select('*');

    if (securitiesError) {
      console.error('Error fetching securities:', securitiesError);
    }

    // If no data found, return empty portfolio
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        summary: {
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          accountCount: 0,
          holdingsCount: 0,
        },
        accounts: [],
        holdings: [],
        topPerformers: [],
        worstPerformers: [],
        allocation: {},
        allocationByAccountType: {},
        securities: [],
        message: 'No portfolio data found. Connect a brokerage to get started.',
      });
    }

    // Calculate portfolio summary (holdings.account_id may reference plaid_accounts.id or account_id)
    const totalValue = holdings?.reduce((sum, holding) => {
      const price = Number(holding.institution_price || holding.institution_value || 0);
      return sum + (Number(holding.quantity) * price);
    }, 0) || 0;

    const totalCostBasis = holdings?.reduce((sum, holding) => {
      return sum + (Number(holding.cost_basis) || 0);
    }, 0) || 0;

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0
      ? ((totalGainLoss / totalCostBasis) * 100)
      : 0;

    // Group holdings by account (holdings.account_id = plaid_accounts.id)
    const holdingsByAccount = accounts.map(account => {
      const accountHoldings = holdings?.filter(h => h.account_id === account.id || h.account_id === account.account_id) || [];
      const accountValue = accountHoldings.reduce((sum, h) =>
        sum + (Number(h.quantity) * Number(h.institution_price || h.institution_value || 0)), 0
      );
      const accountCostBasis = accountHoldings.reduce((sum, h) =>
        sum + (Number(h.cost_basis) || 0), 0
      );

      return {
        ...account,
        holdings: accountHoldings,
        totalValue: accountValue,
        totalCostBasis: accountCostBasis,
        gainLoss: accountValue - accountCostBasis,
        gainLossPercent: accountCostBasis > 0
          ? ((accountValue - accountCostBasis) / accountCostBasis * 100)
          : 0
      };
    });

    // Calculate gains for each holding
    const holdingsWithGains = holdings?.map(holding => {
      const price = Number(holding.institution_price || holding.institution_value || 0);
      const currentValue = Number(holding.quantity) * price;
      const costBasis = Number(holding.cost_basis) || 0;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis * 100) : 0;

      return {
        ...holding,
        currentValue,
        gainLoss,
        gainLossPercent
      };
    }) || [];

    // Top performers
    const topPerformers = [...holdingsWithGains]
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);

    // Worst performers
    const worstPerformers = [...holdingsWithGains]
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 5);

    // Asset allocation by security type
    const securityTypeMap = {};
    securities?.forEach(sec => {
      securityTypeMap[sec.security_id] = sec.type;
    });

    const allocation = holdingsWithGains.reduce((acc, holding) => {
      const type = securityTypeMap[holding.security_id] || 'other';
      const label = type === 'equity' ? 'Stocks' : type === 'etf' ? 'ETFs' : 'Other';
      acc[label] = (acc[label] || 0) + holding.currentValue;
      return acc;
    }, {});

    // Allocation by account type
    const allocationByAccountType = holdingsByAccount.reduce((acc, account) => {
      const type = account.subtype || 'other';
      const label = type === 'brokerage' ? 'Brokerage'
        : type === '401k' ? '401(k)'
          : type === 'ira' ? 'IRA'
            : 'Other';
      acc[label] = (acc[label] || 0) + account.totalValue;
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        accountCount: accounts.length,
        holdingsCount: holdings?.length || 0,
      },
      accounts: holdingsByAccount,
      holdings: holdingsWithGains,
      topPerformers,
      worstPerformers,
      allocation,
      allocationByAccountType,
      securities: securities || [],
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
