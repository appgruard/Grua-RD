import Stripe from "stripe";
import { logger } from "../logger";
import { storage } from "../storage";

export class StripeConnectService {
  private stripe: Stripe | null = null;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2024-11-20.acacia" as any,
      });
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  async createConnectedAccount(conductorId: string): Promise<{
    accountId: string;
    onboardingUrl: string;
  }> {
    if (!this.stripe) {
      throw new Error("Stripe not configured");
    }

    try {
      const conductor = await storage.getConductorByUserId(conductorId);
      if (!conductor) {
        throw new Error("Conductor not found");
      }

      const user = await storage.getUserById(conductor.userId);
      if (!user) {
        throw new Error("User not found");
      }

      const existingAccount = await storage.getConductorStripeAccount(conductor.id);

      if (existingAccount) {
        if (existingAccount.onboardingComplete) {
          throw new Error("Stripe account already configured");
        }

        const accountLink = await this.stripe.accountLinks.create({
          account: existingAccount.stripeAccountId,
          refresh_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/driver/profile?stripe_refresh=true`,
          return_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/driver/profile?stripe_success=true`,
          type: "account_onboarding",
        });

        logger.info("Stripe account link refreshed", {
          conductorId: conductor.id,
          accountId: existingAccount.stripeAccountId,
        });

        return {
          accountId: existingAccount.stripeAccountId,
          onboardingUrl: accountLink.url,
        };
      }

      const account = await this.stripe.accounts.create({
        type: "standard",
        country: "DO",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          conductorId: conductor.id,
          userId: user.id,
        },
      });

      await storage.createConductorStripeAccount({
        conductorId: conductor.id,
        stripeAccountId: account.id,
      });

      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/driver/profile?stripe_refresh=true`,
        return_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5000'}/driver/profile?stripe_success=true`,
        type: "account_onboarding",
      });

      logger.info("Stripe Connected account created", {
        conductorId: conductor.id,
        accountId: account.id,
      });

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error: any) {
      logger.error("Error creating Stripe Connect account", {
        error: error.message,
        conductorId,
      });
      throw error;
    }
  }

  async getAccountStatus(conductorId: string): Promise<any> {
    try {
      const account = await storage.getConductorStripeAccount(conductorId);

      if (!account) {
        return {
          configured: false,
          accountStatus: "not_started",
        };
      }

      return {
        configured: true,
        accountStatus: account.accountStatus,
        onboardingComplete: account.onboardingComplete,
        chargesEnabled: account.chargesEnabled,
        payoutsEnabled: account.payoutsEnabled,
        detailsSubmitted: account.detailsSubmitted,
      };
    } catch (error: any) {
      logger.error("Error getting account status", {
        error: error.message,
        conductorId,
      });
      throw error;
    }
  }

  async handleAccountUpdated(event: Stripe.Event): Promise<void> {
    if (!this.stripe) return;

    try {
      const account = event.data.object as Stripe.Account;

      const existingAccount = await storage.getConductorStripeAccountByAccountId(account.id);

      if (!existingAccount) {
        logger.warn("Stripe account not found in database - potential security issue", {
          accountId: account.id,
        });
        return;
      }

      const updateData: any = {
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        lastWebhookAt: new Date(),
        updatedAt: new Date(),
      };

      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        updateData.onboardingComplete = true;
        updateData.accountStatus = "active";
      }

      await storage.updateConductorStripeAccount(existingAccount.conductorId, updateData);

      logger.info("Stripe account updated", {
        accountId: account.id,
        conductorId: existingAccount.conductorId,
        status: updateData.accountStatus,
      });
    } catch (error: any) {
      logger.error("Error handling account.updated webhook", {
        error: error.message,
      });
      throw error;
    }
  }

  async createTransfer(
    amount: number,
    conductorId: string,
    servicioId: string
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error("Stripe not configured");
    }

    try {
      const account = await storage.getConductorStripeAccount(conductorId);

      if (!account || !account.onboardingComplete) {
        throw new Error("Driver does not have a configured Stripe account");
      }

      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: "dop",
        destination: account.stripeAccountId,
        metadata: {
          servicioId,
          conductorId,
        },
      });

      logger.info("Stripe transfer created", {
        transferId: transfer.id,
        amount,
        conductorId,
        servicioId,
      });

      return transfer.id;
    } catch (error: any) {
      logger.error("Error creating Stripe transfer", {
        error: error.message,
        conductorId,
        servicioId,
      });
      throw error;
    }
  }
}

export const stripeConnectService = new StripeConnectService();
