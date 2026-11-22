"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  X,
  UserPlus,
  Edit2,
  Download,
  MessageSquare,
  FileImage,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Agent, Member, Reseller, CustomerType, formatWhatsAppPhone } from "./types";

interface CustomerModalsProps {
  customerModalSource: "CART" | "MENU";
  currentCardBg: string;
  members: Member[] | null | undefined;
  agents: Agent[] | null | undefined;
  resellers: Reseller[] | null | undefined;
  showSelectMember: boolean;
  setShowSelectMember: (open: boolean) => void;
  showSelectAgent: boolean;
  setShowSelectAgent: (open: boolean) => void;
  showSelectReseller: boolean;
  setShowSelectReseller: (open: boolean) => void;
  isRegisterMemberOpen: boolean;
  setIsRegisterMemberOpen: (open: boolean) => void;
  isRegisterAgentOpen: boolean;
  setIsRegisterAgentOpen: (open: boolean) => void;
  isRegisterResellerOpen: boolean;
  setIsRegisterResellerOpen: (open: boolean) => void;
  newRegData: { name: string; phone: string; address: string };
  setNewRegData: (data: { name: string; phone: string; address: string }) => void;
  onRegisterMember: () => void;
  onRegisterAgent: () => void;
  onRegisterReseller: () => void;
  isEditMemberOpen: boolean;
  setIsEditMemberOpen: (open: boolean) => void;
  isEditAgentOpen: boolean;
  setIsEditAgentOpen: (open: boolean) => void;
  isEditResellerOpen: boolean;
  setIsEditResellerOpen: (open: boolean) => void;
  editingCustomer: any;
  setEditingCustomer: (customer: any) => void;
  onUpdateCustomer: (type: string) => void;
  onSelectMember: (m: Member) => void;
  onSelectAgent: (a: Agent) => void;
  onSelectReseller: (r: Reseller) => void;
  setCustomerType: (type: CustomerType) => void;
}

export function CustomerModals({
  customerModalSource,
  currentCardBg,
  members,
  agents,
  resellers,
  showSelectMember,
  setShowSelectMember,
  showSelectAgent,
  setShowSelectAgent,
  showSelectReseller,
  setShowSelectReseller,
  isRegisterMemberOpen,
  setIsRegisterMemberOpen,
  isRegisterAgentOpen,
  setIsRegisterAgentOpen,
  isRegisterResellerOpen,
  setIsRegisterResellerOpen,
  newRegData,
  setNewRegData,
  onRegisterMember,
  onRegisterAgent,
  onRegisterReseller,
  isEditMemberOpen,
  setIsEditMemberOpen,
  isEditAgentOpen,
  setIsEditAgentOpen,
  isEditResellerOpen,
  setIsEditResellerOpen,
  editingCustomer,
  setEditingCustomer,
  onUpdateCustomer,
  onSelectMember,
  onSelectAgent,
  onSelectReseller,
  setCustomerType,
}: CustomerModalsProps) {
  const [memberSearch, setMemberSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [resellerSearch, setResellerSearch] = useState("");
  const [isPrintingCard, setIsPrintingCard] = useState(false);

  const filterCustomers = <T extends { id?: string; name?: string; phone?: string; address?: string; branch?: string }>(
    list: T[] | null | undefined,
    term: string
  ) => {
    const items = list || [];
    const q = term.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.name, c.phone, c.id, c.branch, c.address].filter(Boolean).some((val) => String(val).toLowerCase().includes(q))
    );
  };

  const filteredMembers = useMemo(() => filterCustomers(members, memberSearch), [members, memberSearch]);
  const filteredAgents = useMemo(() => filterCustomers(agents, agentSearch), [agents, agentSearch]);
  const filteredResellers = useMemo(() => filterCustomers(resellers, resellerSearch), [resellers, resellerSearch]);

  const renderCustomerCardCanvas = (customer: any): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = 1011 * scale;
      canvas.height = 569 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context error"));
        return;
      }

      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = currentCardBg;

      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1011, 569);
        ctx.fillStyle = "#24345d";
        ctx.textBaseline = "middle";

        ctx.font = "bold 24px Arial, sans-serif";
        ctx.fillText((customer.name || "").toUpperCase(), 95, 397);

        ctx.font = "500 16px Arial, sans-serif";
        ctx.fillText((customer.address || "-").toUpperCase(), 95, 423);

        ctx.font = "600 18px Arial, sans-serif";
        ctx.fillText(`ID. ${customer.id}`, 820, 418);

        resolve(canvas);
      };

      img.onerror = () => {
        reject(new Error("Gagal memuat latar"));
      };
    });
  };

  const exportCardFile = async (canvas: HTMLCanvasElement, customer: any, type: string, fileFormat: "PNG" | "PDF") => {
    const fileNameBase = `kartu-${type.toLowerCase()}-${customer.id}`;
    const pngUrl = canvas.toDataURL("image/png");

    if (fileFormat === "PDF") {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1011, 569],
      });
      pdf.addImage(pngUrl, "PNG", 0, 0, 1011, 569);
      pdf.save(`${fileNameBase}.pdf`);
      return pngUrl;
    }

    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${fileNameBase}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return pngUrl;
  };

  const handleDownloadCard = async (customer: any, type: string, fileFormat: "PNG" | "PDF" = "PNG") => {
    if (!customer) return;
    setIsPrintingCard(true);
    try {
      const canvas = await renderCustomerCardCanvas(customer);
      await exportCardFile(canvas, customer, type, fileFormat);
      toast({ title: `Kartu ${fileFormat} Diunduh` });
    } catch (error: any) {
      toast({
        title: error?.message === "Gagal memuat latar" ? "Gagal memuat latar" : "Kesalahan Render",
        variant: "destructive",
      });
    } finally {
      setIsPrintingCard(false);
    }
  };

  const handleSendCardWhatsApp = async (customer: any, type: string, fileFormat: "PNG" | "PDF") => {
    if (!customer) return;
    const waPhone = formatWhatsAppPhone(customer.phone);
    if (!waPhone) {
      toast({
        title: "Nomor WhatsApp tidak tersedia",
        description: "Lengkapi nomor HP/WA pelanggan terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    const roleLabel = type === "MEMBER" ? "Member" : type === "AGEN" ? "Agen" : "Reseller";
    const message = [
      `Assalamu'alaikum Kak *${(customer.name || "").toUpperCase()}*,`,
      ``,
      `Berikut adalah Kartu ${roleLabel} *Nibras House* Anda:`,
      `• *Nama:* ${(customer.name || "").toUpperCase()}`,
      `• *ID ${roleLabel}:* ${customer.id}`,
      customer.branch ? `• *Cabang:* ${customer.branch}` : "",
      customer.address ? `• *Alamat:* ${customer.address}` : "",
      ``,
      `Terima kasih telah berbelanja di Nibras House.`,
    ]
      .filter(Boolean)
      .join("\n");

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    setIsPrintingCard(true);
    try {
      const canvas = await renderCustomerCardCanvas(customer);
      await exportCardFile(canvas, customer, type, fileFormat);

      if (fileFormat === "PNG" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (blob) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          }
        } catch {
          // Clipboard write optional
        }
      }

      toast({
        title: `Kartu ${fileFormat} Siap Dikirim ke WA`,
        description:
          fileFormat === "PNG"
            ? "File PNG telah diunduh (dan disalin ke clipboard). Silakan tempel/lampirkan di chat WhatsApp."
            : "File PDF telah diunduh. Silakan lampirkan file PDF di chat WhatsApp.",
      });
    } catch (error: any) {
      toast({
        title: error?.message === "Gagal memuat latar" ? "Gagal memuat latar" : "Kesalahan Render",
        variant: "destructive",
      });
    } finally {
      setIsPrintingCard(false);
    }
  };

  const renderSelectionListDialog = (
    open: boolean,
    onClose: () => void,
    title: string,
    searchVal: string,
    setSearchVal: (v: string) => void,
    searchPlaceholder: string,
    items: any[],
    emptyText: string,
    role: "MEMBER" | "AGEN" | "RESELLER",
    onOpenRegister: () => void,
    onSelectItem: (item: any) => void,
    onOpenEdit: (item: any) => void
  ) => (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setSearchVal("");
        }
      }}
    >
      <DialogContent aria-describedby={undefined} className="max-w-2xl w-[95vw] rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
        <DialogHeader className="p-6 bg-neutral-950 text-white flex flex-row items-center justify-between">
          <DialogTitle className="font-serif text-xl font-bold tracking-wide">{title}</DialogTitle>
          <Button
            size="sm"
            className="bg-[#C82368] text-white hover:bg-[#a81b56] font-black text-[10px] uppercase tracking-wider rounded-full px-4"
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> DAFTAR BARU
          </Button>
        </DialogHeader>
        <div className="p-6 space-y-4 bg-[#F5F3F0]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 pl-11 pr-10 rounded-full bg-white border border-neutral-200/80 shadow-sm text-xs sm:text-sm font-bold text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-[#C82368]"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => setSearchVal("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ScrollArea className="h-[50vh]">
            <div className="grid grid-cols-1 gap-2.5">
              {items.length > 0 ? (
                items.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 rounded-2xl border border-neutral-200/70 bg-white shadow-sm flex justify-between items-center group"
                  >
                    <div
                      className="cursor-pointer flex-1 min-w-0 pr-2"
                      onClick={() => {
                        onSelectItem(item);
                        setCustomerType(role);
                        onClose();
                      }}
                    >
                      <p className="font-black text-sm uppercase text-neutral-900 truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-neutral-400">
                        {item.phone} | {item.id} | {item.branch}
                      </p>
                      <p className="text-[9px] text-neutral-500 uppercase mt-1 italic truncate">{item.address}</p>
                    </div>
                    <div className="flex gap-1.5 items-center shrink-0">
                      {customerModalSource === "MENU" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-neutral-700 hover:bg-[#F5F3F0]"
                            onClick={() => {
                              setEditingCustomer(item);
                              onOpenEdit(item);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-[#C82368] hover:bg-[#C82368]/10"
                            onClick={() => handleDownloadCard(item, role)}
                            disabled={isPrintingCard}
                            title="Unduh Kartu PNG"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-[#25D366] hover:bg-[#25D366]/10"
                                disabled={isPrintingCard}
                                title="Kirim Kartu via WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl border-neutral-200/80 shadow-xl p-1.5 min-w-[170px]">
                              <DropdownMenuItem
                                onClick={() => handleSendCardWhatsApp(item, role, "PNG")}
                                className="cursor-pointer rounded-xl text-xs font-bold gap-2 py-2"
                              >
                                <FileImage className="h-4 w-4 text-[#25D366]" /> Kirim Format PNG
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSendCardWhatsApp(item, role, "PDF")}
                                className="cursor-pointer rounded-xl text-xs font-bold gap-2 py-2"
                              >
                                <FileText className="h-4 w-4 text-[#C82368]" /> Kirim Format PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                      <Button
                        size="sm"
                        className="bg-neutral-950 hover:bg-[#C82368] text-white border-none rounded-full font-black text-[9px] px-4 h-8 transition-colors"
                        onClick={() => {
                          onSelectItem(item);
                          setCustomerType(role);
                          onClose();
                        }}
                      >
                        PILIH
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-neutral-400">
                  {emptyText}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {renderSelectionListDialog(
        showSelectMember,
        () => setShowSelectMember(false),
        "Database Member",
        memberSearch,
        setMemberSearch,
        "Cari nama, ID, no. telepon, atau alamat member...",
        filteredMembers,
        "Member tidak ditemukan",
        "MEMBER",
        () => setIsRegisterMemberOpen(true),
        onSelectMember,
        () => setIsEditMemberOpen(true)
      )}

      {renderSelectionListDialog(
        showSelectAgent,
        () => setShowSelectAgent(false),
        "Database Agen",
        agentSearch,
        setAgentSearch,
        "Cari nama, ID, no. telepon, atau alamat agen...",
        filteredAgents,
        "Agen tidak ditemukan",
        "AGEN",
        () => setIsRegisterAgentOpen(true),
        onSelectAgent,
        () => setIsEditAgentOpen(true)
      )}

      {renderSelectionListDialog(
        showSelectReseller,
        () => setShowSelectReseller(false),
        "Database Reseller",
        resellerSearch,
        setResellerSearch,
        "Cari nama, ID, no. telepon, atau alamat reseller...",
        filteredResellers,
        "Reseller tidak ditemukan",
        "RESELLER",
        () => setIsRegisterResellerOpen(true),
        onSelectReseller,
        () => setIsEditResellerOpen(true)
      )}

      {/* REGISTRATION DIALOGS */}
      <Dialog open={isRegisterMemberOpen} onOpenChange={setIsRegisterMemberOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-7 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-xl font-bold flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-[#F48FB1]" /> Daftar Member Baru
            </DialogTitle>
          </DialogHeader>
          <div className="p-7 space-y-4 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Nama Member</Label>
              <Input
                value={newRegData.name}
                onChange={(e) => setNewRegData({ ...newRegData, name: e.target.value })}
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">No. WhatsApp</Label>
              <Input
                value={newRegData.phone}
                onChange={(e) => setNewRegData({ ...newRegData, phone: e.target.value })}
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Alamat</Label>
              <Textarea
                value={newRegData.address}
                onChange={(e) => setNewRegData({ ...newRegData, address: e.target.value })}
                className="rounded-2xl bg-[#F5F3F0] border-transparent font-bold min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={onRegisterMember}
            >
              SIMPAN & PILIH
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegisterAgentOpen} onOpenChange={setIsRegisterAgentOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-7 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-xl font-bold flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#F48FB1]" /> Registrasi Agen Baru
            </DialogTitle>
          </DialogHeader>
          <div className="p-7 space-y-4 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Nama Agen</Label>
              <Input
                value={newRegData.name}
                onChange={(e) => setNewRegData({ ...newRegData, name: e.target.value })}
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">No. WhatsApp</Label>
              <Input
                value={newRegData.phone}
                onChange={(e) => setNewRegData({ ...newRegData, phone: e.target.value })}
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Alamat</Label>
              <Textarea
                value={newRegData.address}
                onChange={(e) => setNewRegData({ ...newRegData, address: e.target.value })}
                className="rounded-2xl bg-[#F5F3F0] border-transparent font-bold min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={onRegisterAgent}
            >
              SIMPAN & PILIH
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegisterResellerOpen} onOpenChange={setIsRegisterResellerOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-7 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-xl font-bold flex items-center gap-3">
              <Users className="h-5 w-5 text-[#F48FB1]" /> Registrasi Reseller Baru
            </DialogTitle>
          </DialogHeader>
          <div className="p-7 space-y-4 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Nama Reseller</Label>
              <Input
                value={newRegData.name}
                onChange={(e) => setNewRegData({ ...newRegData, name: e.target.value })}
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">No. WhatsApp</Label>
              <Input
                value={newRegData.phone}
                onChange={(e) => setNewRegData({ ...newRegData, phone: e.target.value })}
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Alamat</Label>
              <Textarea
                value={newRegData.address}
                onChange={(e) => setNewRegData({ ...newRegData, address: e.target.value })}
                className="rounded-2xl bg-[#F5F3F0] border-transparent font-bold min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={onRegisterReseller}
            >
              SIMPAN & PILIH
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOGS */}
      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-lg font-bold">Edit Data Member</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <Input
              value={editingCustomer?.name || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
              placeholder="Nama.."
              className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
            />
            <Input
              value={editingCustomer?.phone || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
              placeholder="WhatsApp.."
              className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
            />
            <Textarea
              value={editingCustomer?.address || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
              placeholder="Alamat.."
              className="rounded-2xl bg-[#F5F3F0] border-transparent font-bold min-h-[80px]"
            />
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-11 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={() => onUpdateCustomer("MEMBER")}
            >
              SIMPAN PERUBAHAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditAgentOpen} onOpenChange={setIsEditAgentOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-lg font-bold">Edit Data Agen</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <Input
              value={editingCustomer?.name || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
              placeholder="Nama.."
              className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
            />
            <Input
              value={editingCustomer?.phone || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
              placeholder="WhatsApp.."
              className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
            />
            <Textarea
              value={editingCustomer?.address || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
              placeholder="Alamat.."
              className="rounded-2xl bg-[#F5F3F0] border-transparent font-bold min-h-[80px]"
            />
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-11 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={() => onUpdateCustomer("AGEN")}
            >
              SIMPAN PERUBAHAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditResellerOpen} onOpenChange={setIsEditResellerOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-lg font-bold">Edit Data Reseller</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <Input
              value={editingCustomer?.name || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
              placeholder="Nama.."
              className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
            />
            <Input
              value={editingCustomer?.phone || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
              placeholder="WhatsApp.."
              className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-bold"
            />
            <Textarea
              value={editingCustomer?.address || ""}
              onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
              placeholder="Alamat.."
              className="rounded-2xl bg-[#F5F3F0] border-transparent font-bold min-h-[80px]"
            />
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-11 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={() => onUpdateCustomer("RESELLER")}
            >
              SIMPAN PERUBAHAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

