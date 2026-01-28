import { headers } from "next/headers";
import { ClientsList } from "@/components/clients/clients-list";

type Client = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  credit_balance: number;
  sessions_count: number;
  billed_total: number;
  billed_mtd: number;
  created_at: string;
};

async function getClients(): Promise<Client[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const headersList = await headers();

  try {
    const response = await fetch(`${apiUrl}/api/admin/clients`, {
      headers: {
        cookie: headersList.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch clients:", response.status);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export default async function ClientsPage() {
  const clients = await getClients();
  return <ClientsList clients={clients} />;
}
