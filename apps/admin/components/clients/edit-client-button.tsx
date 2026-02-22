"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { EditClientModal } from "./edit-client-modal";

type Client = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  contact_email: string | null;
  contact_phone: string | null;
  company_registration: string | null;
  notes: string | null;
};

interface EditClientButtonProps {
  client: Client;
}

export function EditClientButton({ client }: EditClientButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Settings className="mr-2 h-4 w-4" />
        Edit Client
      </Button>
      <EditClientModal
        client={client}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
