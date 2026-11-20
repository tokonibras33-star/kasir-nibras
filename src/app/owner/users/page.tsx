
"use client";

import { useState, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Mail, Key, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase
} from "@/firebase";
import { collection } from "firebase/firestore";

interface SystemUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  associatedStoreId?: string | null;
  passwordHint?: string; 
}

export default function UserManagementPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");

  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: usersData } = useCollection<SystemUser>(usersQuery);
  const users = usersData || [];

  const filtered = useMemo(() => {
    return users.filter(u => 
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.displayName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Access Directory</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Manajemen User</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Daftar profil staf dan izin operasional cabang.</p>
        </div>
      </div>

      <Card className="shadow-sm border border-neutral-200/70 bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-neutral-100 bg-white">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input 
              placeholder="Cari email atau role..." 
              className="pl-10 h-9 sm:h-10 bg-[#F5F3F0] border border-neutral-200/70 rounded-full text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white border-none">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="py-4 pl-6 text-neutral-300">Profil Pengguna (Email)</TableHead>
                  <TableHead className="text-neutral-300">Password Login</TableHead>
                  <TableHead className="text-neutral-300">Izin Akses (Role)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 transition-colors">
                    <TableCell className="font-medium py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#F5F3F0] p-2 rounded-full"><Mail className="h-3.5 w-3.5 text-neutral-600" /></div>
                        <div>
                          <p className="font-bold text-sm text-neutral-900">{u.email}</p>
                          <p className="text-[10px] text-neutral-400 uppercase font-bold">{u.displayName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-700 bg-[#F5F3F0] w-fit px-3 py-1 rounded-full border border-neutral-200/70">
                        <Key className="h-3 w-3 text-[#C82368]" />
                        {u.passwordHint || "••••••••"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.role === 'OWNER' ? 'bg-neutral-950 text-white border-none rounded-full px-3 text-[10px] font-bold tracking-wider' : u.role === 'ADMIN' ? 'bg-[#C82368] text-white border-none rounded-full px-3 text-[10px] font-bold tracking-wider' : 'bg-[#F5F3F0] text-neutral-800 border border-neutral-200 rounded-full px-3 text-[10px] font-bold tracking-wider'}>
                        {u.role?.replace(/_/g, ' ')}
                      </Badge>
                      {u.associatedStoreId && (
                        <p className="text-[9px] mt-1 text-neutral-400 font-bold">
                          CABANG: {u.associatedStoreId.replace(/_/g, ' ')}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-neutral-400 italic">
                      Tidak ada data staf ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
