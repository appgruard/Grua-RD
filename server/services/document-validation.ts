import { storage } from '../storage';
import { pushService } from '../push-service';
import { logSystem } from '../logger';

interface DocumentReminderConfig {
  dias: number;
  tipo: '30_dias' | '15_dias' | '7_dias';
  mensaje: string;
}

const REMINDER_CONFIGS: DocumentReminderConfig[] = [
  { dias: 30, tipo: '30_dias', mensaje: 'Tu documento vence en 30 días. Por favor, renuévalo pronto.' },
  { dias: 15, tipo: '15_dias', mensaje: 'Tu documento vence en 15 días. Renuévalo para evitar suspensión.' },
  { dias: 7, tipo: '7_dias', mensaje: 'URGENTE: Tu documento vence en 7 días. Actualízalo inmediatamente.' },
];

const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  'licencia': 'Licencia de Conducir',
  'matricula': 'Matrícula del Vehículo',
  'seguro_grua': 'Seguro de Grúa',
  'poliza': 'Póliza de Seguro',
};

const JOB_NAME = 'document_validation_check';
const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export class DocumentValidationService {
  private intervalId: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (process.env.ENABLE_SCHEDULER !== 'true') {
      logSystem.info('Document validation scheduler disabled (ENABLE_SCHEDULER != true)');
      return;
    }

    logSystem.info('Starting document validation service');
    
    await this.runValidationCheck();
    
    this.intervalId = setInterval(() => {
      this.runValidationCheck();
    }, RUN_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logSystem.info('Document validation service stopped');
    }
  }

  async runValidationCheck(): Promise<{
    remindersProcessed: number;
    suspensionsProcessed: number;
    errors: string[];
  }> {
    const result = {
      remindersProcessed: 0,
      suspensionsProcessed: 0,
      errors: [] as string[],
    };

    try {
      const job = await storage.getSystemJob(JOB_NAME);
      
      if (job?.isRunning) {
        logSystem.info('Document validation job is already running, skipping...');
        return result;
      }

      await storage.setJobRunning(JOB_NAME, true);

      logSystem.info('Running document validation check...');

      try {
        for (const config of REMINDER_CONFIGS) {
          const remindersCount = await this.sendRemindersForDays(config);
          result.remindersProcessed += remindersCount;
        }
      } catch (error: any) {
        result.errors.push(`Reminder error: ${error.message}`);
        logSystem.error('Error sending reminders', error);
      }

      try {
        const suspensionCount = await this.processExpiredDocuments();
        result.suspensionsProcessed = suspensionCount;
      } catch (error: any) {
        result.errors.push(`Suspension error: ${error.message}`);
        logSystem.error('Error processing expired documents', error);
      }

      await storage.createOrUpdateSystemJob(JOB_NAME, {
        lastRunAt: new Date(),
        nextRunAt: new Date(Date.now() + RUN_INTERVAL_MS),
        isRunning: false,
        lastError: result.errors.length > 0 ? result.errors.join('; ') : null,
      });

      logSystem.info(`Document validation complete: ${result.remindersProcessed} reminders, ${result.suspensionsProcessed} suspensions`);

    } catch (error: any) {
      result.errors.push(`General error: ${error.message}`);
      logSystem.error('Document validation check failed', error);
      
      try {
        await storage.setJobRunning(JOB_NAME, false);
      } catch (e) {
      }
    }

    return result;
  }

  private async sendRemindersForDays(config: DocumentReminderConfig): Promise<number> {
    let count = 0;
    
    const documentosProximos = await storage.getDocumentosProximosAVencer(config.dias);
    
    const documentosEnRango = documentosProximos.filter(doc => {
      if (!doc.validoHasta) return false;
      const diasRestantes = Math.ceil((new Date(doc.validoHasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (config.tipo === '30_dias') {
        return diasRestantes <= 30 && diasRestantes > 15;
      } else if (config.tipo === '15_dias') {
        return diasRestantes <= 15 && diasRestantes > 7;
      } else if (config.tipo === '7_dias') {
        return diasRestantes <= 7 && diasRestantes > 0;
      }
      return false;
    });

    for (const doc of documentosEnRango) {
      try {
        const alreadySent = await storage.hasRecordatorioSent(doc.id, config.tipo);
        if (alreadySent) continue;

        let userId: string | undefined;
        
        if (doc.conductor?.userId) {
          userId = doc.conductor.userId;
        } else if (doc.usuarioId) {
          userId = doc.usuarioId;
        }

        if (!userId) continue;

        const docTypeName = DOCUMENT_TYPE_NAMES[doc.tipo] || doc.tipo;
        const diasRestantes = Math.ceil((new Date(doc.validoHasta!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        await pushService.sendNotification(
          userId,
          `${docTypeName} por vencer`,
          `${config.mensaje} (${diasRestantes} días restantes)`,
          { type: 'document_expiring', documentId: doc.id }
        );

        await storage.registrarRecordatorioEnviado(doc.id, config.tipo);
        count++;

        logSystem.info(`Sent ${config.tipo} reminder for document ${doc.id} to user ${userId}`);
      } catch (error: any) {
        logSystem.error(`Failed to send reminder for document ${doc.id}`, error);
      }
    }

    return count;
  }

  private async processExpiredDocuments(): Promise<number> {
    let count = 0;
    
    const documentosVencidos = await storage.getDocumentosVencidos();
    
    const conductorDocuments = new Map<string, typeof documentosVencidos>();
    
    for (const doc of documentosVencidos) {
      if (!doc.conductor?.id) continue;
      
      const existing = conductorDocuments.get(doc.conductor.id) || [];
      existing.push(doc);
      conductorDocuments.set(doc.conductor.id, existing);
    }

    for (const [conductorId, docs] of conductorDocuments) {
      try {
        const conductor = docs[0].conductor;
        if (!conductor) continue;

        const documentosTipos = docs.map(d => DOCUMENT_TYPE_NAMES[d.tipo] || d.tipo).join(', ');
        
        const alreadyNotified = await Promise.all(
          docs.map(d => storage.hasRecordatorioSent(d.id, 'vencido'))
        );
        
        const allNotified = alreadyNotified.every(n => n);
        
        if (!allNotified) {
          await storage.suspenderConductorPorDocumento(conductorId, `Documentos vencidos: ${documentosTipos}`);
          
          const user = await storage.getUserById(conductor.userId);
          if (user) {
            await pushService.sendNotification(
              user.id,
              'Cuenta Suspendida',
              `Tu cuenta ha sido suspendida por documentos vencidos: ${documentosTipos}. Por favor, renueva tus documentos.`,
              { type: 'account_suspended', reason: 'expired_documents' }
            );
          }

          for (const doc of docs) {
            await storage.registrarRecordatorioEnviado(doc.id, 'vencido');
          }
          
          count++;
          logSystem.info(`Suspended driver ${conductorId} for expired documents: ${documentosTipos}`);
        }
      } catch (error: any) {
        logSystem.error(`Failed to process expired documents for conductor ${conductorId}`, error);
      }
    }

    return count;
  }

  async forceRunCheck(): Promise<{
    remindersProcessed: number;
    suspensionsProcessed: number;
    errors: string[];
  }> {
    logSystem.info('Force running document validation check');
    return this.runValidationCheck();
  }

  async getJobStatus(): Promise<{
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    isRunning: boolean;
    lastError: string | null;
  }> {
    const job = await storage.getSystemJob(JOB_NAME);
    
    if (!job) {
      return {
        lastRunAt: null,
        nextRunAt: null,
        isRunning: false,
        lastError: null,
      };
    }

    return {
      lastRunAt: job.lastRunAt,
      nextRunAt: job.nextRunAt,
      isRunning: job.isRunning,
      lastError: job.lastError,
    };
  }
}

export const documentValidationService = new DocumentValidationService();
