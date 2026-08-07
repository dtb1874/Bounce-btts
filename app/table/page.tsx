import PublicLeagueTable from "@/app/PublicLeagueTable";
import { loadPublicTableData } from "@/lib/public-table";

export const dynamic = "force-dynamic";

export default async function PublicTablePage() {
  const table = await loadPublicTableData();
  return <PublicLeagueTable {...table} />;
}
