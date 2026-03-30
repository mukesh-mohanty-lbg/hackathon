import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"

interface ProgressWithLabelProps {
  label: string;
  value: number
}

export function ProgressBar({ label, labeledValue, value }: ProgressWithLabelProps) {
  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor="progress-upload">
        <span>{label}</span>
        <span className="ml-auto">{labeledValue}</span>
      </FieldLabel>
      <Progress value={value} id="progress-upload" className="text-secondary" />
    </Field>
  )
}
