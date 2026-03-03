import {
  PlaidApi,
  Configuration,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import { apiConfig } from "../config/apis";
import pool from "../config/postgres";
import { db } from "../config/firebase";
import * as admin from "firebase-admin";

const configuration = new Configuration({
  basePath: PlaidEnvironments[apiConfig.plaid.env as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": apiConfig.plaid.clientId,
      "PLAID-SECRET": apiConfig.plaid.secret,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

interface PlaidItem {
  itemId: string;
  institutionId: string | null;
  institutionName: string;
  accessToken: string;
  createdAt: admin.firestore.FieldValue;
}

class PlaidService {
  async createLinkToken(userId: string): Promise<string> {
    try {
      const request = {
        user: { client_user_id: userId },
        client_name: "Ezana Finance",
        products: [Products.Investments],
        country_codes: [CountryCode.Us],
        language: "en",
      };

      const response = await plaidClient.linkTokenCreate(request);
      return response.data.link_token;
    } catch (error) {
      console.error("Error creating link token:", error);
      throw error;
    }
  }

  async exchangePublicToken(publicToken: string, userId: string) {
    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;

      const itemResponse = await plaidClient.itemGet({
        access_token: accessToken,
      });
      const institutionId = itemResponse.data.item.institution_id || null;

      let institutionName = "Unknown Institution";
      if (institutionId) {
        try {
          const institutionResponse = await plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: [CountryCode.Us],
          });
          institutionName = institutionResponse.data.institution.name;
        } catch {
          // Use default if institution lookup fails
        }
      }

      const plaidItem: PlaidItem = {
        itemId,
        institutionId,
        institutionName,
        accessToken,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const existingItems: PlaidItem[] = userDoc.data()?.plaidItems || [];
      const updatedItems = [...existingItems, plaidItem];

      await userRef.set(
        { plaidItems: updatedItems, updated_at: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );

      await this.syncAccounts(userId, accessToken, institutionName);

      return { success: true, institutionName };
    } catch (error) {
      console.error("Error exchanging token:", error);
      throw error;
    }
  }

  async syncAccounts(userId: string, accessToken: string, institutionName: string) {
    try {
      const accountsResponse = await plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });

      const holdingsResponse = await plaidClient.investmentsHoldingsGet({
        access_token: accessToken,
      });

      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date();

      const transactionsResponse = await plaidClient.investmentsTransactionsGet({
        access_token: accessToken,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      });

      for (const account of accountsResponse.data.accounts) {
        const accountHoldings = holdingsResponse.data.holdings.filter(
          (h) => h.account_id === account.account_id
        );
        const securities = holdingsResponse.data.securities;

        const holdingsValue = accountHoldings.reduce((sum, h) => sum + (h.institution_value || 0), 0);
        const totalValue = holdingsValue + (account.balances?.current || 0);
        const cashBalance = account.balances?.current || 0;

        const portfolioResult = await pool.query(
          `
          INSERT INTO portfolios (
            user_id, account_id, institution_name, account_type,
            total_value, cash_balance, updated_at, last_synced
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (account_id)
          DO UPDATE SET
            total_value = $5,
            cash_balance = $6,
            updated_at = NOW(),
            last_synced = NOW()
          RETURNING id
          `,
          [userId, account.account_id, institutionName, account.type || "unknown", totalValue, cashBalance]
        );

        const portfolioId = portfolioResult.rows[0].id;

        await pool.query("DELETE FROM holdings WHERE portfolio_id = $1", [portfolioId]);

        for (const holding of accountHoldings) {
          const security = securities.find((s) => s.security_id === holding.security_id);
          if (security) {
            const costBasis = holding.cost_basis || 0;
            const currentValue = holding.institution_value || 0;
            const totalReturn = currentValue - costBasis;
            const totalReturnPercent = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;
            const symbol = security.ticker_symbol || security.name?.substring(0, 10) || "UNKNOWN";

            await pool.query(
              `
              INSERT INTO holdings (
                portfolio_id, symbol, security_name, quantity,
                cost_basis, current_price, current_value,
                total_return, total_return_percent, sector, asset_class
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `,
              [
                portfolioId,
                symbol,
                security.name,
                holding.quantity,
                costBasis,
                holding.institution_price,
                currentValue,
                totalReturn,
                totalReturnPercent,
                this.mapSector(symbol),
                security.type || "equity",
              ]
            );
          }
        }

        const accountTransactions = transactionsResponse.data.investment_transactions?.filter(
          (t) => t.account_id === account.account_id
        ) || [];

        for (const transaction of accountTransactions) {
          const txId = transaction.investment_transaction_id;
          await pool.query(
            `
            INSERT INTO transactions (
              portfolio_id, transaction_id, symbol, transaction_type,
              quantity, price, amount, fees, transaction_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (transaction_id) DO NOTHING
            `,
            [
              portfolioId,
              txId,
              transaction.security_id || null,
              transaction.type || "unknown",
              transaction.quantity,
              transaction.price,
              transaction.amount,
              transaction.fees || 0,
              transaction.date,
            ]
          );
        }
      }

      console.log(`Synced ${accountsResponse.data.accounts.length} accounts for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error("Error syncing accounts:", error);
      throw error;
    }
  }

  private mapSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
      AAPL: "Technology",
      MSFT: "Technology",
      GOOGL: "Technology",
      AMZN: "Consumer",
      NVDA: "Technology",
      TSLA: "Consumer",
      META: "Technology",
      JNJ: "Healthcare",
      JPM: "Financials",
      V: "Financials",
    };
    return sectorMap[symbol] || "Other";
  }
}

export default new PlaidService();
