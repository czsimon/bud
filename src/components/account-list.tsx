"use client";

import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableViewport,
} from "@/components/data-table";
import {
  EditorFooter,
  EditorSidebar,
  ManagementHeader,
} from "@/components/management-ui";
import { nextMonthlyOnOrAfter } from "@/lib/forecast";
import {
  ACCOUNT_TYPES,
  accountTypeLabel,
  formatDate,
  formatMoney,
  isCompleteDate,
  latestAccountBalance,
  moneyToneClass,
  signedAccountAmount,
  sortAccountBalances,
  type Account,
  type AccountBalance,
  type AccountDraft,
  type AccountType,
} from "@/lib/types";

type Props = {
  accounts: Account[];
  currency: string;
  onSave: (draft: AccountDraft) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

const TYPE_MARKS: Record<AccountType, string> = {
  bank: "B",
  cash: "C",
  investment: "I",
  credit: "Cr",
  other: "O",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newBalance(asOf = today(), amount = 0): AccountBalance {
  return { id: crypto.randomUUID(), asOf, amount };
}

export function AccountList({
  accounts,
  currency,
  onSave,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      [...accounts].sort(
        (a, b) => a.position - b.position || a.name.localeCompare(b.name),
      ),
    [accounts],
  );
  const totalBalance = accounts.reduce((sum, account) => {
    const latest = latestAccountBalance(account);
    return sum + signedAccountAmount(account.type, latest?.amount ?? 0);
  }, 0);
  const creating = editingId === "new";

  function closeEditor() {
    setEditingId(null);
    setError(null);
  }

  function beginAdd() {
    setEditingId("new");
    setName("");
    setType("bank");
    setBalances([newBalance()]);
    setPaymentDueDate("");
    setError(null);
  }

  function beginEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setBalances(
      account.balances.length > 0
        ? sortAccountBalances(account.balances, "desc")
        : [newBalance()],
    );
    setPaymentDueDate(account.paymentDueDate ?? "");
    setError(null);
  }

  function updateBalance(id: string, changes: Partial<AccountBalance>) {
    setBalances((current) =>
      current.map((balance) =>
        balance.id === id ? { ...balance, ...changes } : balance,
      ),
    );
  }

  function addBalance() {
    const taken = new Set(balances.map((balance) => balance.asOf));
    let asOf = today();
    if (taken.has(asOf)) asOf = "";
    setBalances((current) => [newBalance(asOf), ...current]);
  }

  function removeBalance(id: string) {
    setBalances((current) => current.filter((balance) => balance.id !== id));
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the account a name.");
      return;
    }
    const current = accounts.find((account) => account.id === editingId);
    const duplicate = accounts.some(
      (account) =>
        account.id !== current?.id &&
        account.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setError("That account already exists.");
      return;
    }
    if (balances.length === 0) {
      setError("Add at least one dated balance.");
      return;
    }
    const seenDates = new Set<string>();
    for (const balance of balances) {
      if (!isCompleteDate(balance.asOf)) {
        setError("Every balance needs a date.");
        return;
      }
      if (!Number.isFinite(balance.amount)) {
        setError("Enter a valid amount for each balance.");
        return;
      }
      if (seenDates.has(balance.asOf)) {
        setError("Each date can only have one balance.");
        return;
      }
      seenDates.add(balance.asOf);
    }
    const dueDate = type === "credit" ? paymentDueDate : "";
    if (type === "credit" && dueDate && !isCompleteDate(dueDate)) {
      setError("Choose a payment due date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: current?.id,
        name: trimmed,
        type,
        balances,
        paymentDueDate: type === "credit" && isCompleteDate(dueDate) ? dueDate : null,
        position:
          current?.position ??
          accounts.reduce((max, account) => Math.max(max, account.position), -1) +
            1,
      });
      closeEditor();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : creating
            ? "Could not add the account."
            : "Could not save the account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="@container flex min-h-0 flex-1 flex-col bg-surface">
        <ManagementHeader
          title="Accounts"
          description="Pieces of net worth. Record known balances on any date; the forecast uses those snapshots, then applies household cash flow."
          aside={
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Latest balances
              </p>
              <p className={`font-mono text-lg font-medium ${moneyToneClass(totalBalance)}`}>
                {formatMoney(totalBalance, currency, { sign: totalBalance !== 0 })}
              </p>
            </div>
          }
          action={
            <button type="button" className="btn-solid" onClick={beginAdd}>
              Add account
            </button>
          }
        />

        <DataTableViewport>
          <DataTable>
            <DataTableHeader>
              <DataTableHead pad="edge">Account</DataTableHead>
              <DataTableHead>Type</DataTableHead>
              <DataTableHead>Due</DataTableHead>
              <DataTableHead>Latest as of</DataTableHead>
              <DataTableHead pad="edge" className="text-right">
                Balance
              </DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {rows.length === 0 ? (
                <DataTableEmptyRow colSpan={5}>
                  No accounts yet. Add the first slice of what you own.
                </DataTableEmptyRow>
              ) : (
                rows.map((account) => {
                  const latest = latestAccountBalance(account);
                  const signed = latest
                    ? signedAccountAmount(account.type, latest.amount)
                    : 0;
                  return (
                    <DataTableRow
                      key={account.id}
                      interactive
                      onClick={() => beginEdit(account)}
                    >
                      <DataTableCell pad="edge">
                        <span className="inline-flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint font-mono text-[11px] font-medium text-teal-deep">
                            {TYPE_MARKS[account.type]}
                          </span>
                          <span className="font-medium">{account.name}</span>
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-muted">
                        {accountTypeLabel(account.type)}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs text-muted">
                        {account.type === "credit" && account.paymentDueDate
                          ? formatDate(
                              nextMonthlyOnOrAfter(account.paymentDueDate, today()),
                            )
                          : "—"}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs text-muted">
                        {latest ? formatDate(latest.asOf) : "—"}
                      </DataTableCell>
                      <DataTableCell
                        pad="edge"
                        className={`text-right font-mono text-sm font-medium ${
                          latest ? moneyToneClass(signed) : "text-muted"
                        }`}
                      >
                        {latest
                          ? formatMoney(signed, currency, { sign: signed !== 0 })
                          : "—"}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })
              )}
            </DataTableBody>
          </DataTable>
        </DataTableViewport>
      </section>

      {editingId ? (
        <EditorSidebar
          eyebrow="Net worth account"
          title={creating ? "New account" : "Edit account"}
          onClose={closeEditor}
        >
          <form
            onSubmit={(event) => void saveAccount(event)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Name</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Checking, Wallet, Brokerage…"
                  className="field"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Type</span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as AccountType)
                  }
                  className="field"
                >
                  {ACCOUNT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {accountTypeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              {type === "credit" ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Payment due date
                  </span>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(event) => setPaymentDueDate(event.target.value)}
                    className="field"
                  />
                  <span className="mt-1.5 block text-xs text-muted">
                    Repeats monthly on this day. The latest balance is the projected payment.
                  </span>
                </label>
              ) : null}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">Balances</span>
                  <span className="text-xs text-muted">
                    Latest is used in the table
                    {type === "credit"
                      ? "; credit is shown as money owed."
                      : "; older dates still move the forecast."}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-rule">
                  <div className="grid grid-cols-[1fr_7rem_2.25rem] items-center gap-2 border-b border-rule bg-paper px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted sm:grid-cols-[1fr_8.5rem_2.25rem]">
                    <span>Date</span>
                    <span className="text-right">Amount</span>
                    <span aria-hidden />
                  </div>
                  {balances.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted">
                      No balances yet. Add the amount you know on a date.
                    </p>
                  ) : (
                    balances.map((balance, index) => (
                      <div
                        key={balance.id}
                        className="grid grid-cols-[1fr_7rem_2.25rem] items-center gap-2 border-b border-rule/60 px-3 py-1 sm:grid-cols-[1fr_8.5rem_2.25rem]"
                      >
                        <input
                          type="date"
                          value={balance.asOf}
                          onChange={(event) =>
                            updateBalance(balance.id, {
                              asOf: event.target.value,
                            })
                          }
                          aria-label={`Balance ${index + 1} date`}
                          className="cell-input"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={Number.isFinite(balance.amount) ? balance.amount : ""}
                          onChange={(event) =>
                            updateBalance(balance.id, {
                              amount: Number(event.target.value),
                            })
                          }
                          placeholder="0.00"
                          aria-label={`Balance ${index + 1} amount`}
                          className="cell-input text-right font-mono"
                        />
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          aria-label={`Delete balance on ${balance.asOf || "this date"}`}
                          onClick={() => removeBalance(balance.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                  <div className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-sm font-medium text-teal-deep hover:underline"
                      onClick={addBalance}
                    >
                      + Add balance
                    </button>
                  </div>
                </div>
              </div>
              {error ? (
                <p className="text-sm text-warn" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <EditorFooter
              onCancel={closeEditor}
              onDelete={
                creating
                  ? undefined
                  : async () => {
                      const account = accounts.find(
                        (item) => item.id === editingId,
                      );
                      if (!account || !confirm(`Delete “${account.name}”?`))
                        return;
                      try {
                        await onDelete(account.id);
                        closeEditor();
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Could not delete the account.",
                        );
                      }
                    }
              }
              deleteDisabled={accounts.length === 1}
              saving={saving}
              saveLabel={creating ? "Add account" : "Save changes"}
            />
          </form>
        </EditorSidebar>
      ) : null}
    </>
  );
}
