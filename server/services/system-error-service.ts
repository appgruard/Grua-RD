import { createHash } from 'crypto';
import { storage } from '../storage';
import type { InsertSystemError, SystemError } from '@shared/schema';
import { getEmailService } from '../email-service';
import { logSystem } from '../logger';
import { priorityCalculator, type CalculatedPriority } from './priority-calculator';
import { noiseFilter } from './noise-filter';

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ADMIN_EMAIL = 'admin@fourone.com.do';

export interface ErrorContext {
  route?: string;
  method?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SystemErrorRecord {
  id: string;
  fingerprint: string;
  errorType: string;
  errorSource: string;
  severity: string;
  message: string;
  stackTrace?: string;
  route?: string;
  method?: string;
  userId?: string;
  metadata?: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  ticketId?: string | null;
  resolved: boolean;
  calculatedPriority?: string;
  priorityScore?: number;
  groupKey?: string;
  isTransient?: boolean;
}

class SystemErrorService {
  private generateFingerprint(
    errorType: string,
    errorSource: string,
    message: string,
    route?: string
  ): string {
    const normalizedMessage = message
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const data = `${errorType}:${errorSource}:${normalizedMessage}:${route || 'unknown'}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  private async findExistingError(fingerprint: string): Promise<SystemErrorRecord | null> {
    const error = await storage.getSystemErrorByFingerprint(fingerprint);
    
    if (!error) return null;
    
    const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS);
    if (new Date(error.lastOccurrence) < windowStart) {
      return null;
    }

    return error as unknown as SystemErrorRecord;
  }

  private async incrementOccurrence(errorId: string, currentCount: number): Promise<void> {
    await storage.updateSystemError(errorId, {
      occurrenceCount: currentCount + 1,
      lastOccurrence: new Date(),
    });
  }

  private async createErrorRecord(
    data: InsertSystemError
  ): Promise<SystemErrorRecord> {
    const record = await storage.createSystemError(data);
    return record as unknown as SystemErrorRecord;
  }

  private async syncTicketToJira(
    ticket: { id: string; titulo: string; descripcion: string; categoria: string; prioridad: string },
    userId?: string
  ): Promise<{ issueId: string; issueKey: string } | null> {
    try {
      const { jiraService } = await import('./jira-service');
      
      if (!jiraService.isConfigured()) {
        logSystem.debug('Jira not configured, skipping sync for auto-created ticket');
        return null;
      }

      const usuario = userId ? await storage.getUserById(userId) : null;
      
      const result = await jiraService.createIssue({
        id: ticket.id,
        titulo: ticket.titulo,
        descripcion: ticket.descripcion,
        categoria: ticket.categoria as any,
        prioridad: ticket.prioridad as any,
        usuarioNombre: usuario?.nombre || 'Sistema',
        usuarioEmail: usuario?.email,
      });

      await storage.updateTicket(ticket.id, {
        jiraIssueId: result.issueId,
        jiraIssueKey: result.issueKey,
        jiraSyncedAt: new Date(),
      });

      logSystem.info('Auto-synced ticket to Jira', {
        ticketId: ticket.id,
        jiraIssueKey: result.issueKey,
      });

      return result;
    } catch (error) {
      logSystem.error('Failed to sync auto-created ticket to Jira', error);
      return null;
    }
  }

  private async createTicketForError(
    errorRecord: SystemErrorRecord,
    userId?: string,
    calculatedPriority?: CalculatedPriority,
    priorityReasoning?: string[]
  ): Promise<string | null> {
    try {
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => u.userType === 'admin');

      if (adminUsers.length === 0) {
        logSystem.warn('No admin user found to assign error ticket');
        return null;
      }

      const adminId = adminUsers[0].id;
      const ticketUserId = userId || adminId;

      const finalPriority = calculatedPriority || this.mapSeverityToPriority(errorRecord.severity);

      const prioritySection = priorityReasoning && priorityReasoning.length > 0
        ? `**Razones de Prioridad:**\n${priorityReasoning.map(r => `- ${r}`).join('\n')}\n\n`
        : '';

      const descripcion = `
**Error Automático Detectado**

---
**LOG EXACTO DEL ERROR:**
\`\`\`
${errorRecord.message}
\`\`\`
---

${prioritySection}**Tipo:** ${errorRecord.errorType}
**Origen:** ${errorRecord.errorSource}
**Severidad Original:** ${errorRecord.severity}
**Prioridad Calculada:** ${finalPriority}
**Ruta:** ${errorRecord.route || 'N/A'}
**Método:** ${errorRecord.method || 'N/A'}
**Primera Ocurrencia:** ${errorRecord.firstOccurrence instanceof Date ? errorRecord.firstOccurrence.toISOString() : errorRecord.firstOccurrence}
**Ocurrencias:** ${errorRecord.occurrenceCount}
**Fingerprint:** ${errorRecord.fingerprint}
${errorRecord.groupKey ? `**Grupo:** ${errorRecord.groupKey}` : ''}
${errorRecord.isTransient ? '**Nota:** Este es un error transitorio que puede resolverse automáticamente' : ''}

${errorRecord.stackTrace ? `**Stack Trace Completo:**\n\`\`\`\n${errorRecord.stackTrace}\n\`\`\`` : ''}

${errorRecord.metadata ? `**Metadata (contexto adicional):**\n\`\`\`json\n${errorRecord.metadata}\n\`\`\`` : ''}
      `.trim();

      const ticket = await storage.createTicket({
        usuarioId: ticketUserId,
        categoria: 'problema_tecnico',
        prioridad: finalPriority,
        titulo: `[Auto] Error del Sistema: ${errorRecord.errorType}`,
        descripcion,
      });

      await storage.updateTicket(ticket.id, {
        autoCreated: true,
        errorFingerprint: errorRecord.fingerprint,
        sourceComponent: errorRecord.errorSource,
        asignadoA: adminId,
      });

      await storage.updateSystemError(errorRecord.id, { ticketId: ticket.id });

      logSystem.info('Auto-created ticket for system error', {
        ticketId: ticket.id,
        errorId: errorRecord.id,
        fingerprint: errorRecord.fingerprint,
        calculatedPriority: finalPriority,
      });

      this.syncTicketToJira(
        {
          id: ticket.id,
          titulo: ticket.titulo,
          descripcion: ticket.descripcion || descripcion,
          categoria: ticket.categoria,
          prioridad: ticket.prioridad,
        },
        userId
      ).catch(err => {
        logSystem.error('Background Jira sync failed', err);
      });

      return ticket.id;
    } catch (error) {
      logSystem.error('Failed to create ticket for system error', error);
      return null;
    }
  }

  private mapSeverityToPriority(severity: string): CalculatedPriority {
    const priorityMap: Record<string, CalculatedPriority> = {
      low: 'baja',
      medium: 'media',
      high: 'alta',
      critical: 'urgente',
    };
    return priorityMap[severity] || 'media';
  }

  private async sendHighPriorityNotification(
    errorRecord: SystemErrorRecord,
    jiraIssueKey?: string
  ): Promise<void> {
    const effectivePriority = errorRecord.calculatedPriority || this.mapSeverityToPriority(errorRecord.severity);
    
    if (effectivePriority !== 'alta' && effectivePriority !== 'urgente') {
      return;
    }

    try {
      const emailService = await getEmailService();
      const isConfigured = await emailService.isConfigured();

      if (!isConfigured) {
        logSystem.warn('Email service not configured, skipping critical error notification');
        return;
      }

      const severityColor = effectivePriority === 'urgente' ? '#dc3545' : '#ffc107';
      const severityLabel = effectivePriority === 'urgente' ? 'URGENTE' : 'ALTA';

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Error ${severityLabel}</h1>
            <p style="margin: 10px 0 0 0;">Sistema Grúa RD</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
            <h3 style="color: #333;">Detalles del Error:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tipo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.errorType}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Origen:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.errorSource}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Prioridad:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${effectivePriority}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ruta:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.route || 'N/A'}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ocurrencias:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.occurrenceCount}</td></tr>
              ${jiraIssueKey ? `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Jira:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${jiraIssueKey}</td></tr>` : ''}
            </table>
            
            <div style="background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-top: 20px;">
              <strong>Mensaje:</strong>
              <p style="font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-word;">${errorRecord.message}</p>
            </div>
            
            ${errorRecord.ticketId ? `<p style="margin-top: 20px;"><strong>Ticket creado:</strong> #${errorRecord.ticketId}</p>` : ''}
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este es un correo automático del sistema de monitoreo de errores de Grúa RD.
            </p>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        to: ADMIN_EMAIL,
        subject: `[${severityLabel}] Error del Sistema: ${errorRecord.errorType}`,
        html,
        text: `Error ${severityLabel} en Grúa RD\n\nTipo: ${errorRecord.errorType}\nOrigen: ${errorRecord.errorSource}\nMensaje: ${errorRecord.message}\nRuta: ${errorRecord.route || 'N/A'}${jiraIssueKey ? `\nJira: ${jiraIssueKey}` : ''}`,
      });

      logSystem.info('Sent high priority error notification', {
        errorId: errorRecord.id,
        priority: effectivePriority,
        email: ADMIN_EMAIL,
        jiraIssueKey,
      });
    } catch (error) {
      logSystem.error('Failed to send high priority error notification', error);
    }
  }

  async trackError(
    error: {
      errorType: string;
      errorSource: string;
      severity: string;
      message: string;
      stackTrace?: string;
    },
    context: ErrorContext = {}
  ): Promise<{ errorId: string; ticketId?: string; isNew: boolean; filtered?: boolean }> {
    const filterResult = noiseFilter.evaluateError(
      error.message,
      error.stackTrace,
      context.route,
      context.metadata
    );

    if (!filterResult.shouldProcess) {
      logSystem.debug('Error filtered by noise filter', {
        reason: filterResult.reason,
        message: error.message.substring(0, 100),
      });
      return {
        errorId: '',
        isNew: false,
        filtered: true,
      };
    }

    const fingerprint = this.generateFingerprint(
      error.errorType,
      error.errorSource,
      error.message,
      context.route
    );

    const existingError = await this.findExistingError(fingerprint);

    if (existingError) {
      await this.incrementOccurrence(existingError.id, existingError.occurrenceCount);
      
      const priorityResult = priorityCalculator.calculatePriority({
        errorSource: error.errorSource,
        errorType: error.errorType,
        severity: error.severity,
        occurrenceCount: existingError.occurrenceCount + 1,
        route: context.route,
        metadata: context.metadata,
      });

      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      const newSeverityLevel = severityOrder[error.severity as keyof typeof severityOrder] || 1;
      const existingSeverityLevel = severityOrder[existingError.severity as keyof typeof severityOrder] || 1;
      const effectiveSeverityLevel = Math.max(newSeverityLevel, existingSeverityLevel);
      const severityNames = ['low', 'medium', 'high', 'critical'] as const;
      const effectiveSeverity = severityNames[effectiveSeverityLevel - 1] || existingError.severity;
      const wasEscalated = newSeverityLevel > existingSeverityLevel;
      
      let ticketId = existingError.ticketId;
      
      await storage.updateSystemError(existingError.id, { 
        severity: effectiveSeverity as any,
        calculatedPriority: priorityResult.priority,
        priorityScore: priorityResult.total,
        groupKey: filterResult.groupKey,
        isTransient: filterResult.isTransient,
      });
      
      if (!ticketId) {
        ticketId = await this.createTicketForError(
          { 
            ...existingError, 
            severity: effectiveSeverity,
            occurrenceCount: existingError.occurrenceCount + 1,
            groupKey: filterResult.groupKey,
            isTransient: filterResult.isTransient,
          },
          context.userId,
          priorityResult.priority,
          priorityResult.reasoning
        );
      }
      
      if (priorityResult.priority === 'alta' || priorityResult.priority === 'urgente') {
        await this.sendHighPriorityNotification({
          ...existingError,
          severity: effectiveSeverity,
          calculatedPriority: priorityResult.priority,
          occurrenceCount: existingError.occurrenceCount + 1,
          ticketId: ticketId || undefined,
        });
      }
      
      logSystem.info('Incremented occurrence count for existing error', {
        errorId: existingError.id,
        fingerprint,
        newCount: existingError.occurrenceCount + 1,
        severityEscalated: wasEscalated,
        effectiveSeverity,
        calculatedPriority: priorityResult.priority,
        priorityScore: priorityResult.total,
      });

      return {
        errorId: existingError.id,
        ticketId: ticketId || undefined,
        isNew: false,
      };
    }

    const priorityResult = priorityCalculator.calculatePriority({
      errorSource: error.errorSource,
      errorType: error.errorType,
      severity: error.severity,
      occurrenceCount: 1,
      route: context.route,
      metadata: context.metadata,
    });

    const errorData: InsertSystemError = {
      fingerprint,
      errorType: (error.errorType === 'system_error' ? 'unknown' : (['validation', 'authentication', 'authorization', 'database', 'network', 'timeout', 'configuration', 'external_api', 'file_system', 'memory', 'unknown'].includes(error.errorType) ? error.errorType : 'unknown')) as any,
      errorSource: error.errorSource as any,
      severity: error.severity as any,
      message: error.message,
      stackTrace: error.stackTrace,
      route: context.route,
      method: context.method,
      userId: context.userId,
      metadata: context.metadata ? JSON.stringify(context.metadata) : undefined,
      calculatedPriority: priorityResult.priority,
      priorityScore: priorityResult.total,
      groupKey: filterResult.groupKey,
      isTransient: filterResult.isTransient,
    };

    const errorRecord = await this.createErrorRecord(errorData);
    
    const ticketId = await this.createTicketForError(
      {
        ...errorRecord,
        groupKey: filterResult.groupKey,
        isTransient: filterResult.isTransient,
      },
      context.userId,
      priorityResult.priority,
      priorityResult.reasoning
    );

    await this.sendHighPriorityNotification({
      ...errorRecord,
      calculatedPriority: priorityResult.priority,
      ticketId: ticketId || undefined,
    });

    logSystem.info('Created new system error record', {
      errorId: errorRecord.id,
      fingerprint,
      ticketId,
      severity: error.severity,
      calculatedPriority: priorityResult.priority,
      priorityScore: priorityResult.total,
      groupKey: filterResult.groupKey,
    });

    return {
      errorId: errorRecord.id,
      ticketId: ticketId || undefined,
      isNew: true,
    };
  }

  async resolveError(errorId: string, resolvedBy: string): Promise<void> {
    await storage.updateSystemError(errorId, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    });

    logSystem.info('System error resolved', { errorId, resolvedBy });
  }

  async getUnresolvedErrors(limit: number = 50): Promise<SystemErrorRecord[]> {
    const results = await storage.getUnresolvedSystemErrors(limit);
    return results as unknown as SystemErrorRecord[];
  }

  async getErrorStats(): Promise<{
    total: number;
    unresolved: number;
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
    byPriority: Record<string, number>;
    noiseFilterStats: { active: number; patterns: number };
  }> {
    const allErrors = await storage.getAllSystemErrors(1000);
    
    const stats = {
      total: allErrors.length,
      unresolved: allErrors.filter(e => !e.resolved).length,
      bySeverity: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      noiseFilterStats: noiseFilter.getSuppressionStats(),
    };

    for (const error of allErrors.filter(e => !e.resolved)) {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.bySource[error.errorSource] = (stats.bySource[error.errorSource] || 0) + 1;
      const priority = (error as any).calculatedPriority || 'media';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    }

    return stats;
  }
}

export const systemErrorService = new SystemErrorService();
