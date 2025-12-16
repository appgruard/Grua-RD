import { logSystem } from '../utils/logger';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: string | null;
    status: {
      name: string;
      id: string;
    };
    priority: {
      name: string;
      id: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    created: string;
    updated: string;
    assignee?: {
      displayName: string;
      emailAddress: string;
    } | null;
    reporter?: {
      displayName: string;
      emailAddress: string;
    } | null;
    labels?: string[];
  };
}

interface JiraCreateIssuePayload {
  fields: {
    project: { key: string };
    summary: string;
    description: {
      type: string;
      version: number;
      content: Array<{
        type: string;
        content: Array<{
          type: string;
          text: string;
        }>;
      }>;
    };
    issuetype: { name: string };
    priority?: { name: string };
    labels?: string[];
  };
}

interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
  };
}

type TicketCategoria = 'problema_tecnico' | 'consulta_servicio' | 'queja' | 'sugerencia' | 'problema_pago' | 'otro';
type TicketPrioridad = 'baja' | 'media' | 'alta' | 'urgente';
type TicketEstado = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';

const PRIORITY_MAP: Record<TicketPrioridad, string> = {
  baja: 'Low',
  media: 'Medium',
  alta: 'High',
  urgente: 'Highest',
};

const JIRA_PRIORITY_TO_LOCAL: Record<string, TicketPrioridad> = {
  'Lowest': 'baja',
  'Low': 'baja',
  'Medium': 'media',
  'High': 'alta',
  'Highest': 'urgente',
};

const CATEGORY_LABELS: Record<TicketCategoria, string> = {
  problema_tecnico: 'technical-issue',
  consulta_servicio: 'service-inquiry',
  queja: 'complaint',
  sugerencia: 'suggestion',
  problema_pago: 'payment-issue',
  otro: 'other',
};

const STATUS_MAP: Record<TicketEstado, string[]> = {
  abierto: ['To Do', 'Open', 'Backlog', 'New'],
  en_proceso: ['In Progress', 'In Review', 'Selected for Development'],
  resuelto: ['Done', 'Resolved', 'Closed'],
  cerrado: ['Done', 'Resolved', 'Closed'],
};

export class JiraService {
  private config: JiraConfig | null = null;
  private authHeader: string = '';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY;

    if (baseUrl && email && apiToken && projectKey) {
      this.config = { baseUrl, email, apiToken, projectKey };
      this.authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');
      logSystem.info('Jira service initialized successfully');
    } else {
      logSystem.warn('Jira service not configured - missing environment variables');
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  getProjectKey(): string | null {
    return this.config?.projectKey || null;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Jira service not configured');
    }

    const url = `${this.config.baseUrl}/rest/api/3${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logSystem.error('Jira API error', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
        endpoint 
      });
      throw new Error(`Jira API error: ${response.status} - ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async createIssue(ticket: {
    id: string;
    titulo: string;
    descripcion: string;
    categoria: TicketCategoria;
    prioridad: TicketPrioridad;
    usuarioNombre?: string;
    usuarioEmail?: string;
  }): Promise<{ issueId: string; issueKey: string }> {
    if (!this.config) {
      throw new Error('Jira service not configured');
    }

    const description = `
${ticket.descripcion}

---
**Detalles del Ticket**
- ID Local: ${ticket.id}
- Usuario: ${ticket.usuarioNombre || 'N/A'} (${ticket.usuarioEmail || 'N/A'})
- Categoría: ${ticket.categoria}
- Prioridad: ${ticket.prioridad}
    `.trim();

    const payload: JiraCreateIssuePayload = {
      fields: {
        project: { key: this.config.projectKey },
        summary: ticket.titulo,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: { name: 'Task' },
        priority: { name: PRIORITY_MAP[ticket.prioridad] || 'Medium' },
        labels: [
          CATEGORY_LABELS[ticket.categoria] || 'other',
          'grua-rd',
          'support-ticket',
        ],
      },
    };

    const response = await this.request<{ id: string; key: string }>('/issue', 'POST', payload);
    
    logSystem.info('Jira issue created', { 
      ticketId: ticket.id, 
      jiraIssueId: response.id, 
      jiraIssueKey: response.key 
    });

    return { issueId: response.id, issueKey: response.key };
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(`/issue/${issueKey}`);
  }

  async updateIssue(issueKey: string, updates: {
    summary?: string;
    description?: string;
    priority?: TicketPrioridad;
  }): Promise<void> {
    const fields: Record<string, unknown> = {};

    if (updates.summary) {
      fields.summary = updates.summary;
    }

    if (updates.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: updates.description,
              },
            ],
          },
        ],
      };
    }

    if (updates.priority) {
      fields.priority = { name: PRIORITY_MAP[updates.priority] || 'Medium' };
    }

    if (Object.keys(fields).length > 0) {
      await this.request(`/issue/${issueKey}`, 'PUT', { fields });
      logSystem.info('Jira issue updated', { issueKey, updates: Object.keys(updates) });
    }
  }

  async transitionIssue(issueKey: string, targetStatus: TicketEstado): Promise<boolean> {
    const transitions = await this.request<{ transitions: JiraTransition[] }>(
      `/issue/${issueKey}/transitions`
    );

    const targetStatuses = STATUS_MAP[targetStatus] || [];
    const transition = transitions.transitions.find(t => 
      targetStatuses.some(status => 
        t.to.name.toLowerCase() === status.toLowerCase()
      )
    );

    if (!transition) {
      logSystem.warn('No matching Jira transition found', { 
        issueKey, 
        targetStatus, 
        availableTransitions: transitions.transitions.map(t => t.to.name) 
      });
      return false;
    }

    await this.request(`/issue/${issueKey}/transitions`, 'POST', {
      transition: { id: transition.id },
    });

    logSystem.info('Jira issue transitioned', { issueKey, targetStatus, transitionName: transition.name });
    return true;
  }

  async addComment(issueKey: string, comment: string, authorName?: string): Promise<void> {
    const commentText = authorName 
      ? `**${authorName}:**\n${comment}`
      : comment;

    await this.request(`/issue/${issueKey}/comment`, 'POST', {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: commentText,
              },
            ],
          },
        ],
      },
    });

    logSystem.info('Jira comment added', { issueKey });
  }

  async getIssueStatus(issueKey: string): Promise<{
    status: TicketEstado;
    priority: TicketPrioridad;
    jiraStatus: string;
    jiraPriority: string;
  }> {
    const issue = await this.getIssue(issueKey);
    
    const jiraStatus = issue.fields.status.name;
    const jiraPriority = issue.fields.priority.name;

    let localStatus: TicketEstado = 'abierto';
    for (const [status, jiraStatuses] of Object.entries(STATUS_MAP)) {
      if (jiraStatuses.some(s => s.toLowerCase() === jiraStatus.toLowerCase())) {
        localStatus = status as TicketEstado;
        break;
      }
    }

    const localPriority = JIRA_PRIORITY_TO_LOCAL[jiraPriority] || 'media';

    return {
      status: localStatus,
      priority: localPriority,
      jiraStatus,
      jiraPriority,
    };
  }

  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    const response = await this.request<{ issues: JiraIssue[] }>(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`
    );
    return response.issues;
  }

  async getProjectIssueTypes(): Promise<Array<{ id: string; name: string }>> {
    if (!this.config) {
      throw new Error('Jira service not configured');
    }

    const response = await this.request<{ values: Array<{ id: string; name: string }> }>(
      `/project/${this.config.projectKey}/statuses`
    );
    return response.values;
  }

  async testConnection(): Promise<{ success: boolean; projectName?: string; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Jira not configured' };
    }

    try {
      const response = await this.request<{ key: string; name: string }>(
        `/project/${this.config.projectKey}`
      );
      return { success: true, projectName: response.name };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

export const jiraService = new JiraService();
