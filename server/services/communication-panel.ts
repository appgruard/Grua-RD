import { db } from '../db';
import { 
  communicationPanelUsers, 
  emailTemplates, 
  emailSignatures, 
  emailHistory,
  inAppAnnouncements,
  announcementViews,
  pushNotificationConfig,
  pushNotificationHistory,
  users
} from '@shared/schema';
import { eq, and, desc, gte, lte, or, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { logger } from '../logger';
import { EMAIL_ADDRESSES } from '../email-service';

interface CommunicationPanelSession {
  userId: string;
  email: string;
  nombre: string;
  expiresAt: Date;
}

const sessions = new Map<string, CommunicationPanelSession>();

export class CommunicationPanelService {
  
  static async authenticate(email: string, password: string): Promise<{ token: string; user: any } | null> {
    try {
      const [user] = await db.select().from(communicationPanelUsers)
        .where(and(
          eq(communicationPanelUsers.email, email),
          eq(communicationPanelUsers.activo, true)
        ));
      
      if (!user) {
        return null;
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return null;
      }
      
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      sessions.set(token, {
        userId: user.id,
        email: user.email,
        nombre: user.nombre,
        expiresAt
      });
      
      await db.update(communicationPanelUsers)
        .set({ ultimoAcceso: new Date() })
        .where(eq(communicationPanelUsers.id, user.id));
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre
        }
      };
    } catch (error) {
      logger.error('Communication panel auth error:', error);
      return null;
    }
  }
  
  static validateSession(token: string): CommunicationPanelSession | null {
    const session = sessions.get(token);
    if (!session) return null;
    
    if (new Date() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    
    return session;
  }
  
  static logout(token: string): void {
    sessions.delete(token);
  }
  
  static async createTemplate(data: {
    nombre: string;
    asunto: string;
    contenidoHtml: string;
    contenidoTexto?: string;
    categoria?: string;
    variables?: string[];
    creadoPor?: string;
  }) {
    const [template] = await db.insert(emailTemplates).values({
      nombre: data.nombre,
      asunto: data.asunto,
      contenidoHtml: data.contenidoHtml,
      contenidoTexto: data.contenidoTexto,
      categoria: data.categoria || 'general',
      variables: data.variables,
      creadoPor: data.creadoPor,
      activo: true
    }).returning();
    
    return template;
  }
  
  static async getTemplates() {
    return db.select().from(emailTemplates)
      .where(eq(emailTemplates.activo, true))
      .orderBy(desc(emailTemplates.createdAt));
  }
  
  static async getTemplate(id: string) {
    const [template] = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template;
  }
  
  static async updateTemplate(id: string, data: Partial<{
    nombre: string;
    asunto: string;
    contenidoHtml: string;
    contenidoTexto: string;
    categoria: string;
    variables: string[];
    activo: boolean;
  }>) {
    const [template] = await db.update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template;
  }
  
  static async deleteTemplate(id: string) {
    await db.update(emailTemplates)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id));
  }
  
  static async createSignature(data: {
    nombre: string;
    departamento?: string;
    cargo?: string;
    telefono?: string;
    contenidoHtml: string;
    esDefault?: boolean;
    creadoPor?: string;
  }) {
    if (data.esDefault) {
      await db.update(emailSignatures)
        .set({ esDefault: false })
        .where(eq(emailSignatures.esDefault, true));
    }
    
    const [signature] = await db.insert(emailSignatures).values({
      nombre: data.nombre,
      departamento: data.departamento,
      cargo: data.cargo,
      telefono: data.telefono,
      contenidoHtml: data.contenidoHtml,
      esDefault: data.esDefault || false,
      creadoPor: data.creadoPor
    }).returning();
    
    return signature;
  }
  
  static async getSignatures() {
    return db.select().from(emailSignatures)
      .orderBy(desc(emailSignatures.esDefault), desc(emailSignatures.createdAt));
  }
  
  static async updateSignature(id: string, data: Partial<{
    nombre: string;
    departamento: string;
    cargo: string;
    telefono: string;
    contenidoHtml: string;
    esDefault: boolean;
  }>) {
    if (data.esDefault) {
      await db.update(emailSignatures)
        .set({ esDefault: false })
        .where(eq(emailSignatures.esDefault, true));
    }
    
    const [signature] = await db.update(emailSignatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailSignatures.id, id))
      .returning();
    return signature;
  }
  
  static async deleteSignature(id: string) {
    await db.delete(emailSignatures)
      .where(eq(emailSignatures.id, id));
  }
  
  static async sendEmail(data: {
    destinatarios: string[];
    asunto: string;
    contenidoHtml: string;
    alias: string;
    adjuntos?: { filename: string; content: Buffer }[];
    plantillaId?: string;
    firmaId?: string;
    enviadoPor: string;
  }) {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('RESEND_API_KEY not configured');
      }
      
      const resend = new Resend(apiKey);
      const fromEmail = (EMAIL_ADDRESSES as any)[data.alias] || EMAIL_ADDRESSES.info;
      
      const emailPayload: any = {
        from: `Grua RD <${fromEmail}>`,
        to: data.destinatarios,
        subject: data.asunto,
        html: data.contenidoHtml
      };
      
      if (data.adjuntos && data.adjuntos.length > 0) {
        emailPayload.attachments = data.adjuntos.map(a => ({
          filename: a.filename,
          content: a.content
        }));
      }
      
      const { data: result, error } = await resend.emails.send(emailPayload);
      
      if (error) {
        throw error;
      }
      
      const [historyEntry] = await db.insert(emailHistory).values({
        destinatarios: data.destinatarios,
        asunto: data.asunto,
        contenidoHtml: data.contenidoHtml,
        alias: data.alias,
        adjuntos: data.adjuntos?.map(a => a.filename),
        plantillaId: data.plantillaId,
        firmaId: data.firmaId,
        enviadoPor: data.enviadoPor,
        resendId: result?.id,
        estado: 'enviado'
      }).returning();
      
      return { success: true, id: result?.id, historyId: historyEntry.id };
    } catch (error: any) {
      logger.error('Error sending email from panel:', error);
      
      await db.insert(emailHistory).values({
        destinatarios: data.destinatarios,
        asunto: data.asunto,
        contenidoHtml: data.contenidoHtml,
        alias: data.alias,
        enviadoPor: data.enviadoPor,
        estado: 'fallido'
      });
      
      return { success: false, error: error.message };
    }
  }
  
  static async getEmailHistory(limit = 50, offset = 0) {
    return db.select().from(emailHistory)
      .orderBy(desc(emailHistory.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  static async createAnnouncement(data: {
    titulo: string;
    contenido: string;
    imagenUrl?: string;
    tipo?: 'modal' | 'banner' | 'toast' | 'fullscreen';
    audiencia?: 'todos' | 'clientes' | 'conductores' | 'empresas' | 'aseguradoras';
    enlaceAccion?: string;
    textoBoton?: string;
    colorFondo?: string;
    colorTexto?: string;
    fechaInicio?: Date;
    fechaFin?: Date;
    prioridad?: number;
    creadoPor?: string;
  }) {
    const [announcement] = await db.insert(inAppAnnouncements).values({
      titulo: data.titulo,
      contenido: data.contenido,
      imagenUrl: data.imagenUrl,
      tipo: data.tipo || 'modal',
      estado: data.fechaInicio && data.fechaInicio > new Date() ? 'programado' : 'borrador',
      audiencia: data.audiencia || 'todos',
      enlaceAccion: data.enlaceAccion,
      textoBoton: data.textoBoton,
      colorFondo: data.colorFondo || '#1a1a2e',
      colorTexto: data.colorTexto || '#ffffff',
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      prioridad: data.prioridad || 0,
      creadoPor: data.creadoPor
    }).returning();
    
    return announcement;
  }
  
  static async getAnnouncements() {
    return db.select().from(inAppAnnouncements)
      .orderBy(desc(inAppAnnouncements.prioridad), desc(inAppAnnouncements.createdAt));
  }
  
  static async getActiveAnnouncements(userType: string, userId: string) {
    const now = new Date();
    
    const audiencias: ('todos' | 'clientes' | 'conductores' | 'empresas' | 'aseguradoras')[] = ['todos'];
    if (userType === 'cliente') audiencias.push('clientes');
    if (userType === 'conductor') audiencias.push('conductores');
    if (userType === 'empresa') audiencias.push('empresas');
    if (userType === 'aseguradora') audiencias.push('aseguradoras');
    
    const announcements = await db.select().from(inAppAnnouncements)
      .where(and(
        eq(inAppAnnouncements.estado, 'activo'),
        inArray(inAppAnnouncements.audiencia, audiencias),
        or(
          lte(inAppAnnouncements.fechaInicio, now),
          eq(inAppAnnouncements.fechaInicio, null as any)
        ),
        or(
          gte(inAppAnnouncements.fechaFin, now),
          eq(inAppAnnouncements.fechaFin, null as any)
        )
      ))
      .orderBy(desc(inAppAnnouncements.prioridad));
    
    const viewedIds = await db.select({ anuncioId: announcementViews.anuncioId })
      .from(announcementViews)
      .where(and(
        eq(announcementViews.userId, userId),
        eq(announcementViews.descartado, true)
      ));
    
    const viewedSet = new Set(viewedIds.map(v => v.anuncioId));
    
    return announcements.filter(a => !viewedSet.has(a.id));
  }
  
  static async updateAnnouncement(id: string, data: Partial<{
    titulo: string;
    contenido: string;
    imagenUrl: string;
    tipo: 'modal' | 'banner' | 'toast' | 'fullscreen';
    estado: 'borrador' | 'programado' | 'activo' | 'pausado' | 'expirado';
    audiencia: 'todos' | 'clientes' | 'conductores' | 'empresas' | 'aseguradoras';
    enlaceAccion: string;
    textoBoton: string;
    colorFondo: string;
    colorTexto: string;
    fechaInicio: Date | string | null;
    fechaFin: Date | string | null;
    prioridad: number;
  }>) {
    // Clean up the data - convert date strings to Date objects or null
    const cleanData: Record<string, any> = { ...data };
    
    // Handle fechaInicio
    if ('fechaInicio' in cleanData) {
      if (!cleanData.fechaInicio || cleanData.fechaInicio === '') {
        cleanData.fechaInicio = null;
      } else if (typeof cleanData.fechaInicio === 'string') {
        cleanData.fechaInicio = new Date(cleanData.fechaInicio);
      }
    }
    
    // Handle fechaFin
    if ('fechaFin' in cleanData) {
      if (!cleanData.fechaFin || cleanData.fechaFin === '') {
        cleanData.fechaFin = null;
      } else if (typeof cleanData.fechaFin === 'string') {
        cleanData.fechaFin = new Date(cleanData.fechaFin);
      }
    }
    
    const [announcement] = await db.update(inAppAnnouncements)
      .set({ ...cleanData, updatedAt: new Date() })
      .where(eq(inAppAnnouncements.id, id))
      .returning();
    return announcement;
  }
  
  static async deleteAnnouncement(id: string) {
    await db.delete(inAppAnnouncements)
      .where(eq(inAppAnnouncements.id, id));
  }
  
  static async markAnnouncementViewed(anuncioId: string, userId: string, descartado = false) {
    await db.insert(announcementViews).values({
      anuncioId,
      userId,
      visto: true,
      descartado
    }).onConflictDoUpdate({
      target: [announcementViews.anuncioId, announcementViews.userId],
      set: { visto: true, descartado }
    });
  }
  
  static async createPushConfig(data: {
    nombre: string;
    titulo: string;
    cuerpo: string;
    iconoUrl?: string;
    imagenUrl?: string;
    colorAccento?: string;
    sonido?: string;
    vibracion?: boolean;
    prioridad?: string;
    datosExtra?: string;
    creadoPor?: string;
  }) {
    const [config] = await db.insert(pushNotificationConfig).values({
      nombre: data.nombre,
      titulo: data.titulo,
      cuerpo: data.cuerpo,
      iconoUrl: data.iconoUrl,
      imagenUrl: data.imagenUrl,
      colorAccento: data.colorAccento || '#e94560',
      sonido: data.sonido || 'default',
      vibracion: data.vibracion !== false,
      prioridad: data.prioridad || 'high',
      datosExtra: data.datosExtra,
      creadoPor: data.creadoPor
    }).returning();
    
    return config;
  }
  
  static async getPushConfigs() {
    return db.select().from(pushNotificationConfig)
      .orderBy(desc(pushNotificationConfig.createdAt));
  }
  
  static async updatePushConfig(id: string, data: Partial<{
    nombre: string;
    titulo: string;
    cuerpo: string;
    iconoUrl: string;
    imagenUrl: string;
    colorAccento: string;
    sonido: string;
    vibracion: boolean;
    prioridad: string;
    datosExtra: string;
  }>) {
    const [config] = await db.update(pushNotificationConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pushNotificationConfig.id, id))
      .returning();
    return config;
  }
  
  static async deletePushConfig(id: string) {
    await db.delete(pushNotificationConfig)
      .where(eq(pushNotificationConfig.id, id));
  }
  
  static getEmailAliases() {
    return Object.entries(EMAIL_ADDRESSES).map(([key, value]) => ({
      id: key,
      email: value,
      label: key.charAt(0).toUpperCase() + key.slice(1)
    }));
  }
}
