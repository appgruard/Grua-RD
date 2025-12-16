import { createHash } from 'crypto';
import { storage } from '../storage';
import type { InsertSystemError, SystemError } from '@shared/schema';
import { getEmailService } from '../email-service';
import { logSystem } from '../logger';

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
}

class SystemErrorService {
  /**
   * Generate a unique fingerprint for error deduplication
   */
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

  /**
   * Find existing unresolved error with same fingerprint within dedup window
   * Uses storage abstraction
   */
  private async findExistingError(fingerprint: string): Promise<SystemErrorRecord | null> {
    const error = await storage.getSystemErrorByFingerprint(fingerprint);
    
    if (!error) return null;
    
    // Check if within dedup window
    const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS);
    if (new Date(error.lastOccurrence) < windowStart) {
      return null;
    }

    return error as unknown as SystemErrorRecord;
  }

  /**
   * Increment occurrence count for existing error using storage abstraction
   */
  private async incrementOccurrence(errorId: string, currentCount: number): Promise<void> {
    await storage.updateSystemError(errorId, {
      occurrenceCount: currentCount + 1,
      lastOccurrence: new Date(),
    });
  }

  /**
   * Create a new system error record using storage abstraction
   */
  private async createErrorRecord(
    data: InsertSystemError
  ): Promise<SystemErrorRecord> {
    const record = await storage.createSystemError(data);
    return record as unknown as SystemErrorRecord;
  }

  /**
   * Create a ticket for the system error using storage abstraction
   */
  private async createTicketForError(
    errorRecord: SystemErrorRecord,
    userId?: string
  ): Promise<string | null> {
    try {
      // Find an admin user to assign the ticket
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => u.userType === 'admin');

      if (adminUsers.length === 0) {
        logSystem.warn('No admin user found to assign error ticket');
        return null;
      }

      const adminId = adminUsers[0].id;
      const ticketUserId = userId || adminId;

      const priorityMap: Record<string, 'baja' | 'media' | 'alta' | 'urgente'> = {
        low: 'baja',
        medium: 'media',
        high: 'alta',
        critical: 'urgente',
      };

      const ticket = await storage.createTicket({
        usuarioId: ticketUserId,
        categoria: 'problema_tecnico',
        prioridad: priorityMap[errorRecord.severity] || 'media',
        titulo: `[Auto] Error del Sistema: ${errorRecord.errorType}`,
        descripcion: `
**Error Automático Detectado**

---
**LOG EXACTO DEL ERROR:**
\`\`\`
${errorRecord.message}
\`\`\`
---

**Tipo:** ${errorRecord.errorType}
**Origen:** ${errorRecord.errorSource}
**Severidad:** ${errorRecord.severity}
**Ruta:** ${errorRecord.route || 'N/A'}
**Método:** ${errorRecord.method || 'N/A'}
**Primera Ocurrencia:** ${errorRecord.firstOccurrence instanceof Date ? errorRecord.firstOccurrence.toISOString() : errorRecord.firstOccurrence}
**Fingerprint:** ${errorRecord.fingerprint}

${errorRecord.stackTrace ? `**Stack Trace Completo:**\n\`\`\`\n${errorRecord.stackTrace}\n\`\`\`` : ''}

${errorRecord.metadata ? `**Metadata (contexto adicional):**\n\`\`\`json\n${errorRecord.metadata}\n\`\`\`` : ''}
        `.trim(),
      });

      // Update ticket with admin-specific fields
      await storage.updateTicket(ticket.id, {
        autoCreated: true,
        errorFingerprint: errorRecord.fingerprint,
        sourceComponent: errorRecord.errorSource,
        asignadoA: adminId,
      });

      // Link error to ticket
      await storage.updateSystemError(errorRecord.id, { ticketId: ticket.id });

      logSystem.info('Auto-created ticket for system error', {
        ticketId: ticket.id,
        errorId: errorRecord.id,
        fingerprint: errorRecord.fingerprint,
      });

      return ticket.id;
    } catch (error) {
      logSystem.error('Failed to create ticket for system error', error);
      return null;
    }
  }

  /**
   * Send email notification for high priority errors
   */
  private async sendHighPriorityNotification(
    errorRecord: SystemErrorRecord
  ): Promise<void> {
    if (errorRecord.severity !== 'high' && errorRecord.severity !== 'critical') {
      return;
    }

    try {
      const emailService = await getEmailService();
      const isConfigured = await emailService.isConfigured();

      if (!isConfigured) {
        logSystem.warn('Email service not configured, skipping critical error notification');
        return;
      }

      const severityColor = errorRecord.severity === 'critical' ? '#dc3545' : '#ffc107';
      const severityLabel = errorRecord.severity === 'critical' ? 'CRÍTICO' : 'ALTO';

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">⚠️ Error ${severityLabel}</h1>
            <p style="margin: 10px 0 0 0;">Sistema Grúa RD</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
            <h3 style="color: #333;">Detalles del Error:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tipo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.errorType}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Origen:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.errorSource}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Severidad:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.severity}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ruta:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.route || 'N/A'}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ocurrencias:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorRecord.occurrenceCount}</td></tr>
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
        text: `Error ${severityLabel} en Grúa RD\n\nTipo: ${errorRecord.errorType}\nOrigen: ${errorRecord.errorSource}\nMensaje: ${errorRecord.message}\nRuta: ${errorRecord.route || 'N/A'}`,
      });

      logSystem.info('Sent high priority error notification', {
        errorId: errorRecord.id,
        severity: errorRecord.severity,
        email: ADMIN_EMAIL,
      });
    } catch (error) {
      logSystem.error('Failed to send high priority error notification', error);
    }
  }

  /**
   * Main method to track a system error
   */
  async trackError(
    error: {
      errorType: string;
      errorSource: string;
      severity: string;
      message: string;
      stackTrace?: string;
    },
    context: ErrorContext = {}
  ): Promise<{ errorId: string; ticketId?: string; isNew: boolean }> {
    const fingerprint = this.generateFingerprint(
      error.errorType,
      error.errorSource,
      error.message,
      context.route
    );

    const existingError = await this.findExistingError(fingerprint);

    if (existingError) {
      await this.incrementOccurrence(existingError.id, existingError.occurrenceCount);
      
      // Calculate severity levels - only escalate, never downgrade
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      const newSeverityLevel = severityOrder[error.severity as keyof typeof severityOrder] || 1;
      const existingSeverityLevel = severityOrder[existingError.severity as keyof typeof severityOrder] || 1;
      
      // Effective severity is always the maximum (never downgrade)
      const effectiveSeverityLevel = Math.max(newSeverityLevel, existingSeverityLevel);
      const severityNames = ['low', 'medium', 'high', 'critical'] as const;
      const effectiveSeverity = severityNames[effectiveSeverityLevel - 1] || existingError.severity;
      const wasEscalated = newSeverityLevel > existingSeverityLevel;
      
      let ticketId = existingError.ticketId;
      
      // Handle severity escalation - only upgrade, never downgrade
      if (wasEscalated) {
        await storage.updateSystemError(existingError.id, { 
          severity: effectiveSeverity as any 
        });
      }
      
      // Create ticket if missing (use effective severity)
      if (!ticketId) {
        ticketId = await this.createTicketForError(
          { ...existingError, severity: effectiveSeverity },
          context.userId
        );
      }
      
      // Send notification for high/critical errors (using effective severity)
      if (effectiveSeverity === 'high' || effectiveSeverity === 'critical') {
        await this.sendHighPriorityNotification({
          ...existingError,
          severity: effectiveSeverity,
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
      });

      return {
        errorId: existingError.id,
        ticketId: ticketId || undefined,
        isNew: false,
      };
    }

    const errorData: InsertSystemError = {
      fingerprint,
      errorType: error.errorType as any,
      errorSource: error.errorSource as any,
      severity: error.severity as any,
      message: error.message,
      stackTrace: error.stackTrace,
      route: context.route,
      method: context.method,
      userId: context.userId,
      metadata: context.metadata ? JSON.stringify(context.metadata) : undefined,
    };

    const errorRecord = await this.createErrorRecord(errorData);
    const ticketId = await this.createTicketForError(errorRecord, context.userId);
    await this.sendHighPriorityNotification({ ...errorRecord, ticketId: ticketId || undefined });

    logSystem.info('Created new system error record', {
      errorId: errorRecord.id,
      fingerprint,
      ticketId,
      severity: error.severity,
    });

    return {
      errorId: errorRecord.id,
      ticketId: ticketId || undefined,
      isNew: true,
    };
  }

  /**
   * Mark an error as resolved using storage abstraction
   */
  async resolveError(errorId: string, resolvedBy: string): Promise<void> {
    await storage.updateSystemError(errorId, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    });

    logSystem.info('System error resolved', { errorId, resolvedBy });
  }

  /**
   * Get unresolved errors for admin dashboard using storage abstraction
   */
  async getUnresolvedErrors(limit: number = 50): Promise<SystemErrorRecord[]> {
    const results = await storage.getUnresolvedSystemErrors(limit);
    return results as unknown as SystemErrorRecord[];
  }

  /**
   * Get error statistics for dashboard using storage abstraction
   */
  async getErrorStats(): Promise<{
    total: number;
    unresolved: number;
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    const allErrors = await storage.getAllSystemErrors(1000);
    
    const stats = {
      total: allErrors.length,
      unresolved: allErrors.filter(e => !e.resolved).length,
      bySeverity: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
    };

    for (const error of allErrors.filter(e => !e.resolved)) {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.bySource[error.errorSource] = (stats.bySource[error.errorSource] || 0) + 1;
    }

    return stats;
  }
}

export const systemErrorService = new SystemErrorService();
