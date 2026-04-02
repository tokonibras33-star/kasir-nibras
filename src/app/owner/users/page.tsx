
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary">Manajemen User</h1>
          <p className="text-muted-foreground text-sm">Daftar profil staf dan izin operasional cabang.</p>
        </div>
      </div>

      <Card className="soft-shadow border-none rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari email atau role..." 
              className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-none">
                <TableRow>
                  <TableHead className="py-4 pl-6">Profil Pengguna (Email)</TableHead>
                  <TableHead>Password Login</TableHead>
                  <TableHead>Izin Akses (Role)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-medium py-4 pl-6">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <p className="font-bold text-sm text-primary">{u.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black">{u.displayName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/30 w-fit px-2 py-1 rounded-md border border-muted-foreground/10">
                        <Key className="h-3 w-3" />
                        {u.passwordHint || "••••••••"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'OWNER' ? 'default' : u.role === 'ADMIN' ? 'secondary' : 'outline'} className="text-[10px] font-black tracking-wider py-0.5">
                        {u.role?.replace('_', ' ')}
                      </Badge>
                      {u.associatedStoreId && (
                        <p className="text-[9px] mt-1 text-muted-foreground font-bold">
                          CABANG: {u.associatedStoreId.replace('_', ' ')}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
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
