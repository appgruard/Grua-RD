import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

const insuranceSchema = z.object({
  aseguradoraNombre: z.string().min(1, 'Seleccione una aseguradora'),
  aseguradoraPoliza: z.string().min(1, 'Ingrese el número de póliza'),
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface InsuranceFormProps {
  aseguradoraNombre: string;
  aseguradoraPoliza: string;
  onChange: (data: { aseguradoraNombre: string; aseguradoraPoliza: string }) => void;
}

const insuranceCompanies = [
  'Seguros Reservas',
  'Mapfre BHD',
  'La Colonial',
  'SEMMA',
  'Otra',
];

export function InsuranceForm({
  aseguradoraNombre,
  aseguradoraPoliza,
  onChange,
}: InsuranceFormProps) {
  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      aseguradoraNombre: aseguradoraNombre || '',
      aseguradoraPoliza: aseguradoraPoliza || '',
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    onChange({
      aseguradoraNombre: watchedValues.aseguradoraNombre || '',
      aseguradoraPoliza: watchedValues.aseguradoraPoliza || '',
    });
  }, [watchedValues.aseguradoraNombre, watchedValues.aseguradoraPoliza, onChange]);

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormField
          control={form.control}
          name="aseguradoraNombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de Aseguradora</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="input-aseguradora-nombre">
                    <SelectValue placeholder="Seleccione su aseguradora" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {insuranceCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="aseguradoraPoliza"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Póliza</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ingrese su número de póliza"
                  data-testid="input-aseguradora-poliza"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
