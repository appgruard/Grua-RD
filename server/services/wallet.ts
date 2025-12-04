/**
 * Wallet Service - Operator Commission and Debt Management
 * 
 * Handles:
 * - Commission calculation (20% on cash payments)
 * - Debt creation and management
 * - Payment processing (from card services and direct payments)
 * - Overdue debt checking and cash service blocking
 */

import { storage } from '../storage';
import { logTransaction, logSystem } from '../logger';
import { pushService } from '../push-service';
import type { 
  OperatorWallet, 
  WalletWithDetails, 
  OperatorDebt, 
  WalletTransaction,
  Servicio 
} from '@shared/schema';

const COMMISSION_RATE = 0.20;
const DEBT_DUE_DAYS = 15;
const NEAR_DUE_WARNING_DAYS = 3;

let debtCheckIntervalId: NodeJS.Timeout | null = null;

export class WalletService {
  
  /**
   * Initialize the debt checking job
   * Runs every hour to check for overdue debts
   */
  static initDebtCheckJob(): void {
    logSystem.info('Wallet debt check job initialized');
    
    debtCheckIntervalId = setInterval(async () => {
      await WalletService.checkOverdueDebts();
    }, 60 * 60 * 1000);

    setTimeout(() => {
      WalletService.checkOverdueDebts();
    }, 30000);
  }

  /**
   * Stop the debt checking job
   */
  static stopDebtCheckJob(): void {
    if (debtCheckIntervalId) {
      clearInterval(debtCheckIntervalId);
      debtCheckIntervalId = null;
      logSystem.info('Wallet debt check job stopped');
    }
  }

  /**
   * Create a wallet for a new operator
   */
  static async createWallet(conductorId: string): Promise<OperatorWallet> {
    const existingWallet = await storage.getWalletByConductorId(conductorId);
    if (existingWallet) {
      logSystem.warn('Wallet already exists for conductor', { conductorId });
      return existingWallet;
    }

    const wallet = await storage.createOperatorWallet(conductorId);
    logTransaction.info('Operator wallet created', { 
      walletId: wallet.id, 
      conductorId 
    });
    
    return wallet;
  }

  /**
   * Get wallet with all details (balance, debts, transactions)
   */
  static async getWallet(conductorId: string): Promise<WalletWithDetails | null> {
    const wallet = await storage.getWalletByConductorId(conductorId);
    return wallet || null;
  }

  /**
   * Ensure a wallet exists for an operator, create if not
   */
  static async ensureWalletExists(conductorId: string): Promise<OperatorWallet> {
    const wallet = await storage.getWalletByConductorId(conductorId);
    if (wallet) {
      return wallet;
    }
    return await this.createWallet(conductorId);
  }

  /**
   * Calculate commission amount (20%)
   */
  static calculateCommission(amount: number): number {
    return Math.round(amount * COMMISSION_RATE * 100) / 100;
  }

  /**
   * Process a completed service payment
   * 
   * For CASH payments:
   * - Calculate 20% commission
   * - Create debt with 15-day due date
   * - Record transaction
   * 
   * For CARD payments:
   * - Calculate 20% commission (already taken by platform)
   * - If operator has debt, apply 80% earnings to debt
   * - Record transactions
   */
  static async processServicePayment(
    servicioId: string, 
    paymentMethod: 'efectivo' | 'tarjeta',
    serviceAmount: number
  ): Promise<{
    success: boolean;
    commission: number;
    operatorEarnings: number;
    debtPaid?: number;
    newDebt?: number;
    message: string;
  }> {
    const servicio = await storage.getServicioById(servicioId);
    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }

    if (servicio.commissionProcessed) {
      logSystem.warn('Commission already processed for service', { servicioId });
      return {
        success: false,
        commission: 0,
        operatorEarnings: 0,
        message: 'La comisión ya fue procesada para este servicio'
      };
    }

    if (!servicio.conductorId) {
      throw new Error('Servicio no tiene conductor asignado');
    }

    const wallet = await this.ensureWalletExists(servicio.conductorId);
    const commission = this.calculateCommission(serviceAmount);
    const operatorEarnings = serviceAmount - commission;

    let result: {
      success: boolean;
      commission: number;
      operatorEarnings: number;
      debtPaid?: number;
      newDebt?: number;
      message: string;
    };

    if (paymentMethod === 'efectivo') {
      result = await this.processCashPayment(wallet, servicio, serviceAmount, commission, operatorEarnings);
    } else {
      result = await this.processCardPayment(wallet, servicio, serviceAmount, commission, operatorEarnings);
    }

    await storage.markServiceCommissionProcessed(servicioId);

    logTransaction.info('Service payment processed', {
      servicioId,
      paymentMethod,
      serviceAmount,
      commission,
      operatorEarnings,
      walletId: wallet.id,
      ...result
    });

    return result;
  }

  /**
   * Process cash payment - creates debt for commission
   */
  private static async processCashPayment(
    wallet: OperatorWallet,
    servicio: Servicio,
    serviceAmount: number,
    commission: number,
    operatorEarnings: number
  ): Promise<{
    success: boolean;
    commission: number;
    operatorEarnings: number;
    newDebt: number;
    message: string;
  }> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DEBT_DUE_DAYS);

    await storage.createOperatorDebt({
      walletId: wallet.id,
      servicioId: servicio.id,
      originalAmount: commission.toFixed(2),
      remainingAmount: commission.toFixed(2),
      dueDate,
      status: 'pending'
    });

    await storage.createWalletTransaction({
      walletId: wallet.id,
      servicioId: servicio.id,
      type: 'cash_commission',
      amount: commission.toFixed(2),
      commissionAmount: commission.toFixed(2),
      description: `Comisión por servicio en efectivo - ${servicio.id.slice(0, 8)}`
    });

    const currentDebt = parseFloat(wallet.totalDebt) || 0;
    await storage.updateWallet(wallet.id, {
      totalDebt: (currentDebt + commission).toFixed(2)
    });

    const conductor = await storage.getConductorById(servicio.conductorId!);
    if (conductor) {
      await this.sendNotification(
        conductor.userId,
        'Nueva comisión registrada',
        `Se ha registrado una comisión de RD$${commission.toFixed(2)}. Tienes ${DEBT_DUE_DAYS} días para pagarla.`
      );
    }

    return {
      success: true,
      commission,
      operatorEarnings,
      newDebt: commission,
      message: `Servicio en efectivo procesado. Comisión: RD$${commission.toFixed(2)}, Ganancia neta: RD$${operatorEarnings.toFixed(2)}`
    };
  }

  /**
   * Process card payment - may pay off existing debt
   * Applies payments to oldest debts first (chronological order)
   */
  private static async processCardPayment(
    wallet: OperatorWallet,
    servicio: Servicio,
    serviceAmount: number,
    commission: number,
    operatorEarnings: number
  ): Promise<{
    success: boolean;
    commission: number;
    operatorEarnings: number;
    debtPaid: number;
    message: string;
  }> {
    await storage.createWalletTransaction({
      walletId: wallet.id,
      servicioId: servicio.id,
      type: 'card_payment',
      amount: operatorEarnings.toFixed(2),
      commissionAmount: commission.toFixed(2),
      description: `Pago con tarjeta - ${servicio.id.slice(0, 8)}`
    });

    const currentDebt = parseFloat(wallet.totalDebt) || 0;
    let remainingEarnings = operatorEarnings;
    let totalDebtPaid = 0;

    if (currentDebt > 0) {
      const debts = await storage.getOperatorDebts(wallet.id);
      const pendingDebts = debts
        .filter(d => d.status !== 'paid' && parseFloat(d.remainingAmount) > 0)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      for (const debt of pendingDebts) {
        if (remainingEarnings <= 0) break;

        const debtRemaining = parseFloat(debt.remainingAmount);
        if (debtRemaining <= 0) continue;
        
        const paymentAmount = Math.min(remainingEarnings, debtRemaining);

        const newRemaining = Math.max(0, debtRemaining - paymentAmount);
        const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

        await storage.updateOperatorDebt(debt.id, {
          remainingAmount: newRemaining.toFixed(2),
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : undefined
        });

        await storage.createWalletTransaction({
          walletId: wallet.id,
          servicioId: servicio.id,
          type: 'debt_payment',
          amount: paymentAmount.toFixed(2),
          description: `Pago de deuda desde servicio con tarjeta`
        });

        remainingEarnings -= paymentAmount;
        totalDebtPaid += paymentAmount;
      }
    }

    const cappedDebtPaid = Math.min(totalDebtPaid, currentDebt);
    const newBalance = parseFloat(wallet.balance) + remainingEarnings;
    const newDebt = Math.max(0, currentDebt - cappedDebtPaid);

    const updateData: Partial<OperatorWallet> = {
      balance: newBalance.toFixed(2),
      totalDebt: newDebt.toFixed(2)
    };

    const shouldUnblock = newDebt <= 0.01 && wallet.cashServicesBlocked;
    if (shouldUnblock) {
      updateData.cashServicesBlocked = false;
      
      const conductor = await storage.getConductorById(servicio.conductorId!);
      if (conductor) {
        await this.sendNotification(
          conductor.userId,
          '¡Servicios reactivados!',
          'Tu deuda ha sido saldada. Los servicios en efectivo han sido reactivados.'
        );
      }
    }

    await storage.updateWallet(wallet.id, updateData);

    const message = cappedDebtPaid > 0
      ? `Servicio con tarjeta procesado. RD$${cappedDebtPaid.toFixed(2)} aplicado a deuda. Balance: RD$${newBalance.toFixed(2)}`
      : `Servicio con tarjeta procesado. Balance actualizado: RD$${newBalance.toFixed(2)}`;

    return {
      success: true,
      commission,
      operatorEarnings,
      debtPaid: cappedDebtPaid,
      message
    };
  }

  /**
   * Pay debt directly with operator's card
   * Returns payment intent data for Stripe processing
   * 
   * PRODUCTION NOTE: Replace paymentIntentId generation with actual Stripe
   * PaymentIntent creation using stripe.paymentIntents.create()
   * The returned clientSecret should be used with Stripe Elements on the frontend
   */
  static async createDebtPaymentIntent(
    conductorId: string,
    amount: number
  ): Promise<{
    success: boolean;
    amount: number;
    walletId: string;
    totalDebt: number;
    paymentIntentId: string;
    message: string;
  }> {
    const wallet = await storage.getWalletByConductorId(conductorId);
    if (!wallet) {
      throw new Error('Billetera no encontrada');
    }

    const totalDebt = parseFloat(wallet.totalDebt);
    if (totalDebt <= 0) {
      throw new Error('No tienes deuda pendiente');
    }

    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    if (amount > totalDebt) {
      amount = totalDebt;
    }

    // Generate a unique payment intent ID for this transaction
    // PRODUCTION: Replace with stripe.paymentIntents.create() and return the actual PaymentIntent ID
    const paymentIntentId = `pi_dev_${wallet.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      amount,
      walletId: wallet.id,
      totalDebt,
      paymentIntentId,
      message: `Pago de RD$${amount.toFixed(2)} listo para procesar`
    };
  }

  /**
   * Complete a direct debt payment after Stripe confirmation
   */
  static async completeDebtPayment(
    walletId: string,
    amount: number,
    paymentIntentId: string
  ): Promise<{
    success: boolean;
    amountPaid: number;
    remainingDebt: number;
    message: string;
  }> {
    const wallet = await storage.getWalletById(walletId);
    if (!wallet) {
      throw new Error('Billetera no encontrada');
    }

    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    const currentDebt = parseFloat(wallet.totalDebt);
    if (currentDebt <= 0) {
      throw new Error('No hay deuda pendiente para pagar');
    }

    const cappedAmount = Math.min(amount, currentDebt);

    const debts = await storage.getOperatorDebts(walletId);
    const pendingDebts = debts
      .filter(d => d.status !== 'paid')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    let remainingPayment = cappedAmount;
    let totalPaid = 0;

    for (const debt of pendingDebts) {
      if (remainingPayment <= 0) break;

      const debtRemaining = parseFloat(debt.remainingAmount);
      if (debtRemaining <= 0) continue;
      
      const paymentAmount = Math.min(remainingPayment, debtRemaining);

      const newRemaining = Math.max(0, debtRemaining - paymentAmount);
      const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

      await storage.updateOperatorDebt(debt.id, {
        remainingAmount: newRemaining.toFixed(2),
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : undefined
      });

      remainingPayment -= paymentAmount;
      totalPaid += paymentAmount;
    }

    await storage.createWalletTransaction({
      walletId,
      type: 'direct_payment',
      amount: totalPaid.toFixed(2),
      paymentIntentId,
      description: `Pago directo de deuda con tarjeta`
    });

    const newDebt = Math.max(0, currentDebt - totalPaid);

    const updateData: Partial<OperatorWallet> = {
      totalDebt: newDebt.toFixed(2)
    };

    const updatedWallet = await storage.getWalletById(walletId);
    const shouldUnblock = newDebt <= 0.01 && (updatedWallet?.cashServicesBlocked || wallet.cashServicesBlocked);
    
    if (shouldUnblock) {
      updateData.cashServicesBlocked = false;
    }

    await storage.updateWallet(walletId, updateData);

    const conductor = await storage.getConductorById(wallet.conductorId);
    if (conductor) {
      if (newDebt <= 0) {
        await this.sendNotification(
          conductor.userId,
          '¡Deuda saldada!',
          'Tu deuda ha sido pagada completamente. Los servicios en efectivo están disponibles.'
        );
      } else {
        await this.sendNotification(
          conductor.userId,
          'Pago recibido',
          `Tu pago de RD$${totalPaid.toFixed(2)} ha sido procesado. Deuda restante: RD$${newDebt.toFixed(2)}`
        );
      }
    }

    logTransaction.info('Direct debt payment completed', {
      walletId,
      amountPaid: totalPaid,
      remainingDebt: newDebt,
      paymentIntentId
    });

    return {
      success: true,
      amountPaid: totalPaid,
      remainingDebt: newDebt,
      message: newDebt <= 0 
        ? '¡Tu deuda ha sido saldada completamente!'
        : `Pago procesado. Deuda restante: RD$${newDebt.toFixed(2)}`
    };
  }

  /**
   * Check for overdue debts and block cash services
   */
  static async checkOverdueDebts(): Promise<void> {
    try {
      const overdueDebts = await storage.getOverdueDebts();
      
      if (overdueDebts.length === 0) {
        return;
      }

      logSystem.info(`Found ${overdueDebts.length} overdue debts to process`);

      const processedWallets = new Set<string>();

      for (const debt of overdueDebts) {
        if (debt.status === 'overdue') continue;

        await storage.updateOperatorDebt(debt.id, { status: 'overdue' });

        if (!processedWallets.has(debt.walletId)) {
          await this.blockCashServices(debt.walletId);
          processedWallets.add(debt.walletId);
        }
      }

      await this.sendNearDueWarnings();
    } catch (error) {
      logSystem.error('Error checking overdue debts', error);
    }
  }

  /**
   * Send warnings for debts near due date
   */
  private static async sendNearDueWarnings(): Promise<void> {
    try {
      const nearDueDebts = await storage.getDebtsNearDue(NEAR_DUE_WARNING_DAYS);
      
      for (const debt of nearDueDebts) {
        const wallet = await storage.getWalletById(debt.walletId);
        if (!wallet) continue;

        const conductor = await storage.getConductorById(wallet.conductorId);
        if (!conductor) continue;

        const dueDate = new Date(debt.dueDate);
        const now = new Date();
        const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining === 1) {
          await this.sendNotification(
            conductor.userId,
            '¡Último día!',
            `Tu deuda de RD$${debt.remainingAmount} vence hoy. Paga ahora para evitar bloqueos.`
          );
        } else if (daysRemaining === 3) {
          await this.sendNotification(
            conductor.userId,
            'Deuda próxima a vencer',
            `Tu deuda de RD$${debt.remainingAmount} vence en ${daysRemaining} días.`
          );
        }
      }
    } catch (error) {
      logSystem.error('Error sending near due warnings', error);
    }
  }

  /**
   * Block cash services for an operator
   */
  static async blockCashServices(walletId: string): Promise<void> {
    const wallet = await storage.getWalletById(walletId);
    if (!wallet) return;

    if (wallet.cashServicesBlocked) return;

    await storage.updateWallet(walletId, { cashServicesBlocked: true });

    const conductor = await storage.getConductorById(wallet.conductorId);
    if (conductor) {
      await this.sendNotification(
        conductor.userId,
        'Servicios bloqueados',
        'Tus servicios en efectivo han sido bloqueados por deuda vencida. Paga tu deuda para reactivarlos.'
      );
    }

    logSystem.warn('Cash services blocked for operator', { 
      walletId, 
      conductorId: wallet.conductorId 
    });
  }

  /**
   * Unblock cash services for an operator
   */
  static async unblockCashServices(walletId: string): Promise<void> {
    const wallet = await storage.getWalletById(walletId);
    if (!wallet) return;

    if (!wallet.cashServicesBlocked) return;

    await storage.updateWallet(walletId, { cashServicesBlocked: false });

    const conductor = await storage.getConductorById(wallet.conductorId);
    if (conductor) {
      await this.sendNotification(
        conductor.userId,
        '¡Servicios reactivados!',
        'Tus servicios en efectivo han sido reactivados.'
      );
    }

    logSystem.info('Cash services unblocked for operator', { 
      walletId, 
      conductorId: wallet.conductorId 
    });
  }

  /**
   * Check if operator can accept cash services
   */
  static async canAcceptCashService(conductorId: string): Promise<{
    canAccept: boolean;
    reason?: string;
    totalDebt?: number;
  }> {
    const wallet = await storage.getWalletByConductorId(conductorId);
    
    if (!wallet) {
      return { canAccept: true };
    }

    if (wallet.cashServicesBlocked) {
      return {
        canAccept: false,
        reason: 'Tienes servicios en efectivo bloqueados por deuda vencida',
        totalDebt: parseFloat(wallet.totalDebt)
      };
    }

    return { canAccept: true };
  }

  /**
   * Get wallet transactions history
   */
  static async getTransactionHistory(
    conductorId: string, 
    limit: number = 50
  ): Promise<WalletTransaction[]> {
    const wallet = await storage.getWalletByConductorId(conductorId);
    if (!wallet) {
      return [];
    }

    return await storage.getWalletTransactions(wallet.id, limit);
  }

  /**
   * Admin: Adjust wallet balance or debt manually
   */
  static async adminAdjustment(
    walletId: string,
    adjustmentType: 'balance' | 'debt',
    amount: number,
    reason: string,
    adminId: string
  ): Promise<OperatorWallet> {
    const wallet = await storage.getWalletById(walletId);
    if (!wallet) {
      throw new Error('Billetera no encontrada');
    }

    if (adjustmentType === 'balance') {
      const newBalance = parseFloat(wallet.balance) + amount;
      await storage.updateWallet(walletId, { balance: newBalance.toFixed(2) });
    } else {
      const newDebt = parseFloat(wallet.totalDebt) + amount;
      await storage.updateWallet(walletId, { 
        totalDebt: Math.max(0, newDebt).toFixed(2) 
      });
    }

    await storage.createWalletTransaction({
      walletId,
      type: 'adjustment',
      amount: amount.toFixed(2),
      description: `Ajuste admin: ${reason} (por ${adminId})`
    });

    logTransaction.info('Admin wallet adjustment', {
      walletId,
      adjustmentType,
      amount,
      reason,
      adminId
    });

    const updatedWallet = await storage.getWalletById(walletId);
    return updatedWallet!;
  }

  /**
   * Send push notification
   */
  private static async sendNotification(
    userId: string, 
    title: string, 
    body: string
  ): Promise<void> {
    try {
      await pushService.sendToUser(userId, {
        title,
        body,
        data: { type: 'wallet_notification' },
        tag: 'wallet',
      });
    } catch (error) {
      logSystem.error('Failed to send wallet notification', { userId, error });
    }
  }
}

export function initWalletService(): void {
  WalletService.initDebtCheckJob();
}

export function stopWalletService(): void {
  WalletService.stopDebtCheckJob();
}
