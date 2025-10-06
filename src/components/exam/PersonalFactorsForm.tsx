import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const personalFactorsSchema = z.object({
  estado_civil: z.enum(['casado', 'soltero', 'divorciado', 'viudo'], {
    required_error: 'Debe seleccionar su estado civil'
  }),
  tiene_hijos: z.enum(['si', 'no'], {
    required_error: 'Debe indicar si tiene hijos'
  }),
  situacion_habitacional: z.enum(['casa_propia', 'rentando', 'vive_con_familiares'], {
    required_error: 'Debe seleccionar su situación habitacional'
  }),
  edad: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num > 0 && num < 120;
  }, {
    message: 'Debe ingresar una edad válida entre 1 y 119 años'
  })
});

type PersonalFactorsData = z.infer<typeof personalFactorsSchema>;

interface PersonalFactorsFormProps {
  onSubmit: (data: {
    estado_civil: string;
    tiene_hijos: boolean;
    situacion_habitacional: string;
    edad: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const PersonalFactorsForm: React.FC<PersonalFactorsFormProps> = ({
  onSubmit,
  isLoading = false
}) => {
  const { toast } = useToast();
  
  const form = useForm<PersonalFactorsData>({
    resolver: zodResolver(personalFactorsSchema)
  });

  const handleSubmit = async (data: PersonalFactorsData) => {
    try {
      await onSubmit({
        estado_civil: data.estado_civil,
        tiene_hijos: data.tiene_hijos === 'si',
        situacion_habitacional: data.situacion_habitacional,
        edad: parseInt(data.edad)
      });
      
      toast({
        title: 'Datos guardados',
        description: 'Sus datos personales han sido registrados correctamente.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los datos. Intente nuevamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Información Personal</CardTitle>
        <CardDescription>
          Por favor complete la siguiente información antes de comenzar su evaluación.
          Estos datos nos ayudarán a personalizar su experiencia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Estado Civil */}
            <FormField
              control={form.control}
              name="estado_civil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cuál es su estado civil?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione su estado civil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="casado">Casado</SelectItem>
                      <SelectItem value="soltero">Soltero</SelectItem>
                      <SelectItem value="divorciado">Divorciado</SelectItem>
                      <SelectItem value="viudo">Viudo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hijos */}
            <FormField
              control={form.control}
              name="tiene_hijos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Tiene hijos?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="si" id="hijos_si" />
                        <Label htmlFor="hijos_si">Sí</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="hijos_no" />
                        <Label htmlFor="hijos_no">No</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Situación Habitacional */}
            <FormField
              control={form.control}
              name="situacion_habitacional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cuál es su situación habitacional?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione su situación habitacional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="casa_propia">Casa propia</SelectItem>
                      <SelectItem value="rentando">Rentando</SelectItem>
                      <SelectItem value="vive_con_familiares">Vive con familiares o terceros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Edad */}
            <FormField
              control={form.control}
              name="edad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cuál es su edad?</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ingrese su edad"
                      min={1}
                      max={119}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Continuar con la evaluación'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};