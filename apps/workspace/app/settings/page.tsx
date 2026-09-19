import Link from "next/link";
import { ProviderSetup } from "@/components/provider-setup";
import { providerSettingsMetadata } from "@/lib/provider-settings";
import { findRepoRoot } from "@/lib/workspace-data";
import styles from "./settings.module.css";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = providerSettingsMetadata(findRepoRoot());

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <span>AbleArc Settings</span>
          <h1>Settings</h1>
        </div>
        <Link href="/">Back to Today</Link>
      </header>
      <ProviderSetup initial={settings} mode="settings" />
    </main>
  );
}
