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
import {
  ACCOUNT_TYPES,
  accountTypeLabel,
  formatDate,
  formatMoney,
  isCompleteDate,
  type Account,
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

export function AccountList({
  accounts,
  currency,
  onSave,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");
  const [balanceDate, setBalanceDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      [...accounts].sort(
        (a, b) => a.position - b.position || a.name.localeCompare(b.name),
      ),
    [accounts],
  );
  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const creating = editingId === "new";

  function closeEditor() {
    setEditingId(null);
    setError(null);
  }

  function beginAdd() {
    setEditingId("new");
    setName("");
    setType("bank");
    setBalance("");
    setBalanceDate(today());
    setError(null);
  }

  function beginEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setBalance(String(account.balance));
    setBalanceDate(account.balanceDate);
    setError(null);
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
    const amount = Number(balance || 0);
    if (!Number.isFinite(amount)) {
      setError("Enter a valid starting balance.");
      return;
    }
    if (!isCompleteDate(balanceDate)) {
      setError("Choose the date that balance was known.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: current?.id,
        name: trimmed,
        type,
        balance: amount,
        balanceDate,
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
      <section className="flex min-h-0 flex-1 flex-col bg-surface">
        <ManagementHeader
          title="Accounts"
          description="Pieces of net worth. The forecast starts from these dated balances, then applies household cash flow."
          aside={
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Total starting balances
              </p>
              <p className="font-mono text-lg font-medium">
                {formatMoney(totalBalance, currency)}
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
              <DataTableHead>Date</DataTableHead>
              <DataTableHead pad="edge" className="text-right">
                Balance
              </DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {rows.length === 0 ? (
                <DataTableEmptyRow colSpan={4}>
                  No accounts yet. Add the first slice of what you own.
                </DataTableEmptyRow>
              ) : (
                rows.map((account) => (
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
                      {formatDate(account.balanceDate)}
                    </DataTableCell>
                    <DataTableCell
                      pad="edge"
                      className="text-right font-mono text-sm font-medium"
                    >
                      {formatMoney(account.balance, currency)}
                    </DataTableCell>
                  </DataTableRow>
                ))
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-sm font-medium">
                    Starting balance
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                    placeholder="0.00"
                    className="field font-mono"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium">
                    Balance date
                  </span>
                  <input
                    type="date"
                    value={balanceDate}
                    onChange={(event) => setBalanceDate(event.target.value)}
                    className="field"
                  />
                </label>
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
