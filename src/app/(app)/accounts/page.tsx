"use client";

import { AccountList } from "@/components/account-list";
import { useHousehold } from "@/components/household-provider";

export default function AccountsPage() {
  const { accounts, profile, saveAccount, deleteAccount } = useHousehold();

  return (
    <AccountList
      accounts={accounts}
      currency={profile.currency}
      onSave={saveAccount}
      onDelete={deleteAccount}
    />
  );
}
