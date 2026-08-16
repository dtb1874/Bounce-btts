import { redirect } from "next/navigation";
import type { PublicTableData } from "@/lib/public-table";

export default function PublicLeagueTable(_props: PublicTableData) {
  redirect("/table");
  return null;
}
