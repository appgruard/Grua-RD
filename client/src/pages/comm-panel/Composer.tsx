import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCommPanelAuth } from '@/contexts/CommPanelAuthContext';
import { useToast } from '@/hooks/use-toast';
import { CommPanelLayout } from '@/components/comm-panel/CommPanelLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, AlertCircle } from 'lucide-react';

interface EmailAlias {
  id: string;
  email: string;
  label: string;
}

interface EmailTemplate {
  id: string;
  nombre: string;
  asunto: string;
  contenidoHtml: string;
}

const composerSchema = z.object({
  destinatarios: z
    .string()
    .min(1, 'Por favor ingresa al menos un correo electrónico')
    .refine(
      (val) => {
        const emails = val.split(',').map(e => e.trim());
        return emails.every(email => 
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );
      },
      'Todos los correos electrónicos deben ser válidos (separados por comas)'
    ),
  asunto: z.string().min(1, 'El asunto es requerido'),
  alias: z.string().min(1, 'Por favor selecciona un alias'),
  contenidoHtml: z.string().min(1, 'El contenido es requerido'),
});

type ComposerFormValues = z.infer<typeof composerSchema>;

export default function Composer() {
  const { apiRequest } = useCommPanelAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const form = useForm<ComposerFormValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      destinatarios: '',
      asunto: '',
      alias: '',
      contenidoHtml: '',
    },
  });

  // Fetch email aliases
  const { data: aliases = [], isLoading: isLoadingAliases } = useQuery({
    queryKey: ['/api/comm-panel/email-aliases'],
    queryFn: async () => {
      return await apiRequest<EmailAlias[]>('/api/comm-panel/email-aliases');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch email templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/comm-panel/templates'],
    queryFn: async () => {
      return await apiRequest<EmailTemplate[]>('/api/comm-panel/templates');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: ComposerFormValues) => {
      const destinatariosArray = data.destinatarios
        .split(',')
        .map(e => e.trim());

      return await apiRequest('/api/comm-panel/send-email', {
        method: 'POST',
        body: JSON.stringify({
          destinatarios: destinatariosArray,
          asunto: data.asunto,
          contenidoHtml: data.contenidoHtml,
          alias: data.alias,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Correo enviado correctamente',
      });
      form.reset();
      setSelectedTemplate('');
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/email-history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar el correo',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (values: ComposerFormValues) => {
    await sendEmailMutation.mutateAsync(values);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      form.setValue('asunto', template.asunto);
      form.setValue('contenidoHtml', template.contenidoHtml);
    }
  };

  return (
    <CommPanelLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-composer">
            Enviar Correo Electrónico
          </h1>
          <p className="text-muted-foreground" data-testid="text-subtitle">
            Compone y envía correos electrónicos a tus destinatarios
          </p>
        </div>

        <div className="space-y-6">
          {/* Template Selection Card */}
          {templates.length > 0 && (
            <Card data-testid="card-templates">
              <CardHeader>
                <CardTitle className="text-lg">Plantillas (Opcional)</CardTitle>
                <CardDescription>
                  Selecciona una plantilla para autocompletar el asunto y contenido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Selecciona una plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id} data-testid={`option-template-${template.id}`}>
                        {template.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Composer Form Card */}
          <Card data-testid="card-composer-form">
            <CardHeader>
              <CardTitle>Composer</CardTitle>
              <CardDescription>
                Completa los campos para enviar un correo electrónico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-composer">
                  {/* Alias Selector */}
                  <FormField
                    control={form.control}
                    name="alias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alias del Remitente</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger
                              disabled={isLoadingAliases}
                              data-testid="select-alias"
                            >
                              <SelectValue placeholder="Selecciona un alias..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {aliases.map((alias) => (
                              <SelectItem
                                key={alias.id}
                                value={alias.id}
                                data-testid={`option-alias-${alias.id}`}
                              >
                                {alias.label} ({alias.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isLoadingAliases && (
                          <FormDescription className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Cargando alias...
                          </FormDescription>
                        )}
                        <FormMessage data-testid="error-alias" />
                      </FormItem>
                    )}
                  />

                  {/* Destinatarios */}
                  <FormField
                    control={form.control}
                    name="destinatarios"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinatarios</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="correo1@example.com, correo2@example.com, correo3@example.com"
                            data-testid="input-destinatarios"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Separa múltiples correos electrónicos con comas
                        </FormDescription>
                        <FormMessage data-testid="error-destinatarios" />
                      </FormItem>
                    )}
                  />

                  {/* Asunto */}
                  <FormField
                    control={form.control}
                    name="asunto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asunto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ingresa el asunto del correo"
                            data-testid="input-asunto"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-asunto" />
                      </FormItem>
                    )}
                  />

                  {/* Contenido HTML */}
                  <FormField
                    control={form.control}
                    name="contenidoHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenido (HTML)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ingresa el contenido del correo (HTML permitido)"
                            className="font-mono text-sm"
                            rows={12}
                            data-testid="textarea-contenido"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Puedes usar HTML para formatear el contenido
                        </FormDescription>
                        <FormMessage data-testid="error-contenido" />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={sendEmailMutation.isPending || isLoadingAliases}
                    className="w-full gap-2"
                    data-testid="button-send-email"
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Correo
                      </>
                    )}
                  </Button>

                  {/* Error Alert */}
                  {sendEmailMutation.isError && (
                    <div
                      className="flex items-center gap-3 p-4 rounded-md border border-destructive/20 bg-destructive/10 text-destructive"
                      data-testid="alert-error"
                    >
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm">
                        {(sendEmailMutation.error as any)?.message || 'Ocurrió un error al enviar el correo'}
                      </span>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </CommPanelLayout>
  );
}
