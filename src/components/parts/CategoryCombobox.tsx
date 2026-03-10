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

const presets = [
  "Guidão",
  "Cubo",
  "Câmbio",
  "Pneu",
  "Quadro",
  "Garfo",
  "Pedal",
  "Selim",
  "Corrente",
  "Freio",
  "Roda",
  "Aro",
  "Raio",
  "Mesa",
  "Canote",
  "Movimento Central",
  "Cassete",
  "Coroa",
];

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCombobox({ value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const options = presets.map((p) => ({ label: p, value: p }));

  // Allow free-text: if input doesn't match any preset, user can still use it
  const handleSelect = (selected: string) => {
    onChange(selected === value ? "" : selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-sm font-normal bg-card border-border"
        >
          {value || "Selecionar categoria..."}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar ou digitar..."
            value={inputValue}
            onValueChange={setInputValue}
            className="text-sm"
          />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm"
                onClick={() => {
                  onChange(inputValue);
                  setOpen(false);
                }}
              >
                Usar "{inputValue}"
              </button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={handleSelect}
                  className="text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
