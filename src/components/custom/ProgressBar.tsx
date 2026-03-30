import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"

interface ProgressWithLabelProps {
  label: string;
  value: number;
  labeledValue: string;
}

export function ProgressBar({ label, labeledValue, value }: ProgressWithLabelProps) {
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel htmlFor="progress-upload " className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{labeledValue}</span>
      </FieldLabel>
      <Progress value={value} id="progress-upload" className="text-secondary h-1" />
    </Field>
  )
}
