"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, ArrowUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCatalogSectionProps {
  search: string;
  setSearch: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  filteredProducts: any[];
  onProductClick: (product: any) => void;
}

export function ProductCatalogSection({
  search,
  setSearch,
  sortBy,
  setSortBy,
  filteredProducts,
  onProductClick,
}: ProductCatalogSectionProps) {
  return (
    <main className="h-[45vh] md:h-full md:col-span-6 p-3 md:p-6 overflow-y-auto bg-[#ECEAE6] border-b md:border-b-0 md:border-r border-neutral-900/10 scrollbar-hide">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Cari produk..."
              className="h-10 md:h-12 pl-11 rounded-full border border-white/90 shadow-sm bg-white/85 backdrop-blur-md text-xs md:text-sm font-bold text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-[#C82368]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 md:h-12 rounded-full shadow-sm bg-white/85 hover:bg-white backdrop-blur-md border border-white/90 px-5 font-bold text-[10px] md:text-xs uppercase tracking-wider text-neutral-800"
              >
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-[#C82368]" /> Urutkan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl w-48 border-neutral-200/80 shadow-xl" align="end">
              <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                <DropdownMenuRadioItem value="name-asc" className="text-xs font-bold uppercase">
                  Nama (A-Z)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-asc" className="text-xs font-bold uppercase">
                  Harga Terendah
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-desc" className="text-xs font-bold uppercase">
                  Harga Tertinggi
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4 pb-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p, idx) => (
              <Card
                key={idx}
                className="rounded-3xl bg-white/90 hover:bg-white border border-white/90 shadow-[0_8px_25px_-8px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_32px_-8px_rgba(200,35,104,0.14)] card-hover cursor-pointer overflow-hidden group transition-all duration-300"
                onClick={() => onProductClick(p)}
              >
                <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center gap-1">
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-[#C82368]/10 text-[#C82368] border-none text-[6px] md:text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                        {p.category}
                      </Badge>
                      <Badge className="text-[6px] md:text-[8px] font-black bg-[#F5F3F0] text-neutral-600 border-none px-2 py-0.5 rounded-full">
                        {p.brand}
                      </Badge>
                    </div>
                    <span className={cn("text-[7px] md:text-[9px] font-black shrink-0", p.stock < 5 ? "text-rose-600" : "text-neutral-400")}>
                      {p.stock} PCS
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[10px] md:text-[11px] font-black uppercase text-neutral-900 line-clamp-2 leading-tight group-hover:text-[#C82368] transition-colors">
                      {p.baseName}
                    </h3>
                    <p className="text-[7px] md:text-[10px] text-neutral-400 font-bold uppercase mt-1">
                      {p.color}/{p.size}/{p.buyDiscount || "0"}%
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 md:pt-3.5 border-t border-dashed border-neutral-200/80">
                    <p className="text-neutral-950 font-black text-[11px] md:text-[15px] tracking-tight">
                      Rp{p.price.toLocaleString()}
                    </p>
                    <div className="bg-neutral-950 text-white p-1.5 rounded-full group-hover:bg-[#C82368] transition-colors shadow-sm">
                      <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
              <Package className="h-16 w-16 mb-4 text-neutral-500" />
              <p className="font-black uppercase tracking-widest text-sm text-neutral-600">
                Produk tidak ditemukan
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

