import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string | null;
  className?: string;
  children?: React.ReactNode;
};

export function FormField({ id, label, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children}
      {error ? (
        <div id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function FormFieldInput({
  id,
  label,
  error,
  className,
  ...props
}: FormFieldProps & React.ComponentProps<typeof Input>) {
  return (
    <FormField id={id} label={label} error={error} className={className}>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </FormField>
  );
}
