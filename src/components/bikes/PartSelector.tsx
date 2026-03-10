import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import type { Part } from "@/hooks/useParts";

interface PartSelectorProps {
  parts: Part[];
  selectedPartId: string | null;
  customName: string | null;
  onSelectPart: (partId: string) => void;
  onCustomName: (name: string) => void;
}

export function PartSelector({
  parts,
  selectedPartId,
  customName,
  onSelectPart,
  onCustomName,
}: PartSelectorProps) {
  const [open, setOpen] = useState(false);
  const [useCustom, setUseCustom] = useState(!!customName && !selectedPartId);

  const selectedPart = parts.find((p) => p.id === selectedPartId);
  const displayLabel = selectedPart
    ? `${selectedPart.name}${selectedPart.category ? ` (${selectedPart.category})` : ""}`
    : customName || "";

  if (useCustom) {
    return (
      <div className="flex gap-2">
        <Input
          value={customName || ""}
          onChange={(e) => onCustomName(e.target.value)}
          placeholder="Nome personalizado da peça"
          className="bg-background border-border h-8 text-xs flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => setUseCustom(false)}
        >
          Catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="flex-1 justify-between h-8 text-xs font-normal bg-background border-border"
          >
            <span className="truncate">{displayLabel || "Selecionar peça do catálogo..."}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border" align="start">
          <Command>
            <CommandInput placeholder="Buscar peça..." className="text-xs" />
            <CommandList>
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                Nenhuma peça encontrada
              </CommandEmpty>
              <CommandGroup>
                {parts.map((part) => (
                  <CommandItem
                    key={part.id}
                    value={`${part.name} ${part.category || ""}`}
                    onSelect={() => {
                      onSelectPart(part.id);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        selectedPartId === part.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{part.name}</span>
                    {part.category && (
                      <span className="ml-1 text-muted-foreground">({part.category})</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs shrink-0"
        onClick={() => {
          setUseCustom(true);
          onCustomName("");
        }}
      >
        Manual
      </Button>
    </div>
  );
}
