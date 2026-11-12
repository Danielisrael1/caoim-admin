import { saveExpense } from "@/app/(app)/finance/actions";
import { ActionForm } from "@/components/action-form";
import { Grid, Section, SelectField, TextArea, TextField } from "@/components/ui";
import { BRANCHES, PAY_METHOD } from "@/lib/constants";
import { optionsOf, type Named } from "@/lib/finance";
import { today } from "@/lib/format";

export type ExpenseRow = {
  id?: string;
  date: string;
  amount: number | string;
  category_id: string;
  description: string;
  payee: string;
  method: string;
  branch: string;
  reference: string;
  approved_by: string;
  notes: string;
};

export function ExpenseForm({ expense, categories }: { expense: ExpenseRow | null; categories: Named[] }) {
  const e: ExpenseRow = expense ?? {
    date: today(),
    amount: "",
    category_id: "",
    description: "",
    payee: "",
    method: "cash",
    branch: "Maya",
    reference: "",
    approved_by: "",
    notes: "",
  };
  return (
    <ActionForm action={saveExpense.bind(null, e.id ?? null)} submitLabel={e.id ? "Save changes" : "Record expense"} cancelHref="/finance/expenses">
      <Section>
        <div className="space-y-5">
          <Grid cols={3}>
            <TextField label="Date" name="date" type="date" required defaultValue={e.date} />
            <TextField label="Amount (UGX)" name="amount" inputMode="numeric" required defaultValue={String(e.amount)} className="input figure" autoComplete="off" />
            <SelectField label="Category" name="category_id" defaultValue={e.category_id} blank="Choose…" options={optionsOf(categories, e.category_id)} required />
          </Grid>
          <TextField label="What it was for" name="description" required defaultValue={e.description} placeholder="Electricity bill, October" />
          <Grid cols={3}>
            <TextField label="Paid to" name="payee" defaultValue={e.payee} />
            <SelectField label="Method" name="method" defaultValue={e.method} options={PAY_METHOD} />
            <TextField label="Receipt / reference" name="reference" defaultValue={e.reference} className="input figure" />
            <TextField label="Approved by" name="approved_by" defaultValue={e.approved_by} />
            <SelectField label="Branch" name="branch" defaultValue={e.branch} options={BRANCHES} />
          </Grid>
          <TextArea label="Notes" name="notes" defaultValue={e.notes} rows={2} />
        </div>
      </Section>
    </ActionForm>
  );
}
