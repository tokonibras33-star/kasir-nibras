import { Suspense } from "react";
import PrintClient from "./PrintClient";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Menyiapkan Antrean Cetak...
        </p>
      </div>
    }>
      <PrintClient />
    </Suspense>
  );
}
