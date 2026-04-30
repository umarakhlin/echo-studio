import type { Metadata } from "next";

import { BackupClient } from "./BackupClient";

export const metadata: Metadata = {
  title: "גיבוי",
};

export default function AdminBackupPage() {
  return <BackupClient />;
}
