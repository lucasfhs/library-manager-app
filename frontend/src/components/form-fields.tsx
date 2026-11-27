import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: ReactNode;
  className?: string;
};

type TextFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<ComponentProps<"input">, "name" | "value" | "onChange" | "defaultValue"> & {
    /** Formats the visible value while typing (CPF, phone, CEP). */
    mask?: (value: string) => string;
  };

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  mask,
  ...inputProps
}: TextFieldProps<T>) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            id={id}
            value={field.value ?? ""}
            onChange={(event) => field.onChange(mask ? mask(event.target.value) : event.target.value)}
            aria-invalid={fieldState.invalid || undefined}
            aria-describedby={description ? `${id}-description` : undefined}
          />
          {description && !fieldState.error && (
            <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
          )}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  autoComplete = "current-password",
}: BaseProps<T> & { autoComplete?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              {...field}
              id={id}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              value={field.value ?? ""}
              aria-invalid={fieldState.invalid || undefined}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {description && !fieldState.error && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
