import { storage } from '../storage';
import { logSystem } from '../logger';

// TODO: Integrar servicio de pagos Azul cuando esté disponible
// import { azulPaymentService } from './azul-payment';

const SAME_DAY_WITHDRAWAL_COMMISSION = 100;
const SCHEDULED_PAYOUT_DAYS = [1, 5];

let payoutIntervalId: NodeJS.Timeout | null = null;

export function initScheduledPayouts() {
  logSystem.info('Scheduled payouts service initialized', { 
    payoutDays: SCHEDULED_PAYOUT_DAYS.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d])
  });

  payoutIntervalId = setInterval(async () => {
    await checkAndProcessScheduledPayouts();
  }, 60 * 60 * 1000);

  setTimeout(() => {
    checkAndProcessScheduledPayouts();
  }, 10000);
}

export function stopScheduledPayouts() {
  if (payoutIntervalId) {
    clearInterval(payoutIntervalId);
    payoutIntervalId = null;
    logSystem.info('Scheduled payouts service stopped');
  }
}

async function checkAndProcessScheduledPayouts() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();

    if (!SCHEDULED_PAYOUT_DAYS.includes(dayOfWeek) || hours < 8 || hours > 9) {
      return;
    }

    logSystem.info('Checking for scheduled payouts', { dayOfWeek, hours });

    await processScheduledPayouts();
  } catch (error) {
    logSystem.error('Error in checkAndProcessScheduledPayouts', error);
  }
}

export async function processScheduledPayouts(): Promise<{ processed: number; failed: number; totalAmount: number }> {
  const results = { processed: 0, failed: 0, totalAmount: 0 };

  try {
    const conductoresWithBalance = await storage.getConductoresWithPositiveBalance();
    
    if (conductoresWithBalance.length === 0) {
      logSystem.info('No operators with positive balance for scheduled payout');
      return results;
    }

    logSystem.info(`Processing scheduled payouts for ${conductoresWithBalance.length} operators`);

    const scheduledPayout = await storage.createScheduledPayout({
      fechaProgramada: new Date(),
      notas: `Pago programado automático - ${new Date().toLocaleDateString('es-DO')}`,
    });

    for (const conductor of conductoresWithBalance) {
      const balance = parseFloat(conductor.balanceDisponible);
      
      if (balance < 100) {
        logSystem.info('Skipping operator with balance below minimum', { 
          conductorId: conductor.id,
          balance 
        });
        continue;
      }

      try {
        const bankAccount = await storage.getOperatorBankAccountByCondutorId(conductor.id);
        
        if (!bankAccount || bankAccount.estado !== 'verificada') {
          logSystem.warn('Operator has no verified bank account', { 
            conductorId: conductor.id,
            hasBankAccount: !!bankAccount,
            bankAccountStatus: bankAccount?.estado
          });
          continue;
        }

        const user = await storage.getUserById(conductor.userId);
        if (!user) {
          logSystem.warn('Could not find user for conductor', { conductorId: conductor.id });
          continue;
        }

        await storage.createScheduledPayoutItem({
          scheduledPayoutId: scheduledPayout.id,
          conductorId: conductor.id,
          monto: balance.toString(),
        });

        // TODO: Integrar servicio de pagos Azul cuando esté disponible
        // if (!azulPaymentService.isConfigured()) {
        //   logSystem.warn('Azul not configured, skipping payout processing');
        //   continue;
        // }
        logSystem.warn('Payment service not configured, marking payout as pending manual processing');

        // TODO: Implementar llamada a Azul para procesar pago
        // const payoutResult = await azulPaymentService.createPayout({...});

        await storage.updateConductorBalance(conductor.id, 0, 0, true);

        await storage.updateScheduledPayoutItem(conductor.id, scheduledPayout.id, {
          estado: 'pendiente', // TODO: Cambiar a 'pagado' cuando Azul esté integrado
          procesadoAt: new Date(),
        });

        results.processed++;
        results.totalAmount += balance;

        logSystem.info('Scheduled payout processed', { 
          conductorId: conductor.id,
          amount: balance,
          payoutId: payoutResult.payoutId
        });
      } catch (payoutError: any) {
        results.failed++;
        logSystem.error('Failed to process scheduled payout for operator', payoutError, { 
          conductorId: conductor.id 
        });

        await storage.updateScheduledPayoutItem(conductor.id, scheduledPayout.id, {
          estado: 'fallido',
          errorMessage: payoutError.message,
          procesadoAt: new Date(),
        });
      }
    }

    await storage.updateScheduledPayout(scheduledPayout.id, {
      estado: results.failed === 0 ? 'pagado' : (results.processed > 0 ? 'procesando' : 'fallido'),
      totalPagos: results.processed,
      montoTotal: results.totalAmount.toString(),
      fechaProcesado: new Date(),
    });

    logSystem.info('Scheduled payouts batch completed', results);
  } catch (error) {
    logSystem.error('Error processing scheduled payouts batch', error);
    throw error;
  }

  return results;
}

export async function requestImmediateWithdrawal(
  conductorId: string, 
  amount: number
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  try {
    const conductor = await storage.getConductorById(conductorId);
    if (!conductor) {
      return { success: false, error: 'Conductor no encontrado' };
    }

    const availableBalance = parseFloat(conductor.balanceDisponible);
    if (amount > availableBalance) {
      return { success: false, error: `Saldo insuficiente. Disponible: RD$${availableBalance.toFixed(2)}` };
    }

    if (amount < 500) {
      return { success: false, error: 'El monto mínimo de retiro es RD$500' };
    }

    const netAmount = amount - SAME_DAY_WITHDRAWAL_COMMISSION;
    if (netAmount <= 0) {
      return { success: false, error: `El monto debe ser mayor a la comisión de RD$${SAME_DAY_WITHDRAWAL_COMMISSION}` };
    }

    const bankAccount = await storage.getOperatorBankAccountByCondutorId(conductorId);
    if (!bankAccount || bankAccount.estado !== 'verificada') {
      return { success: false, error: 'No tienes una cuenta bancaria verificada. Registra tu cuenta primero.' };
    }

    const user = await storage.getUserById(conductor.userId);
    if (!user) {
      return { success: false, error: 'Error al obtener datos del usuario' };
    }

    const withdrawal = await storage.createOperatorWithdrawal({
      conductorId,
      monto: amount.toString(),
      montoNeto: netAmount.toString(),
      comision: SAME_DAY_WITHDRAWAL_COMMISSION.toString(),
      tipoRetiro: 'inmediato',
    });

    // TODO: Integrar servicio de pagos Azul cuando esté disponible
    // if (!azulPaymentService.isConfigured()) { ... }
    
    // Por ahora, marcar como pendiente para procesamiento manual
    await storage.updateOperatorWithdrawal(withdrawal.id, {
      estado: 'pendiente',
      errorMessage: 'Servicio de pagos pendiente de integración. Se procesará manualmente.',
    });

    await storage.updateConductorBalance(
      conductorId, 
      -amount, 
      0, 
      false
    );

    logSystem.info('Immediate withdrawal created (pending manual processing)', { 
      conductorId,
      withdrawalId: withdrawal.id,
      amount,
      netAmount,
      commission: SAME_DAY_WITHDRAWAL_COMMISSION
    });

    return { success: true, withdrawalId: withdrawal.id };
  } catch (error: any) {
    logSystem.error('Error in requestImmediateWithdrawal', error, { conductorId });
    return { success: false, error: 'Error interno. Por favor intenta más tarde.' };
  }
}

function getBankCode(bancoNombre: string): string {
  const bankCodes: Record<string, string> = {
    'Banco Popular': 'BPD',
    'Banco de Reservas': 'BDR',
    'Banco BHD León': 'BHD',
    'Banreservas': 'BDR',
    'Scotiabank': 'SCO',
    'Banco Santa Cruz': 'BSC',
    'Banco Promerica': 'BPR',
    'Banco López de Haro': 'BLH',
    'Banco Vimenca': 'VIM',
    'APAP': 'APA',
    'Banco Caribe': 'BCR',
    'Banco Ademi': 'ADE',
    'Banco BDI': 'BDI',
    'Banco Lafise': 'LAF',
    'Citibank': 'CIT',
  };

  for (const [name, code] of Object.entries(bankCodes)) {
    if (bancoNombre.toLowerCase().includes(name.toLowerCase())) {
      return code;
    }
  }

  return 'XXX';
}

export function getNextPayoutDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  let daysUntilPayout = 7;
  
  for (const payoutDay of SCHEDULED_PAYOUT_DAYS) {
    const diff = payoutDay - dayOfWeek;
    if (diff > 0 && diff < daysUntilPayout) {
      daysUntilPayout = diff;
    } else if (diff < 0 && (7 + diff) < daysUntilPayout) {
      daysUntilPayout = 7 + diff;
    } else if (diff === 0) {
      const hours = now.getHours();
      if (hours < 9) {
        daysUntilPayout = 0;
      }
    }
  }
  
  const nextPayout = new Date(now);
  nextPayout.setDate(now.getDate() + daysUntilPayout);
  nextPayout.setHours(9, 0, 0, 0);
  
  return nextPayout;
}

export { SAME_DAY_WITHDRAWAL_COMMISSION, SCHEDULED_PAYOUT_DAYS };
