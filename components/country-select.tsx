"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { countries } from "@/lib/country-data"

// Définition locale stricte pour le composant
interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
}

interface CountrySelectProps {
  value: Country
  onChange: (country: Country) => void
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between mt-1.5 bg-transparent border-white/10 text-white"
        >
          <span className="truncate flex items-center gap-2">
            <span className="text-xl">{value?.flag}</span>
            {value?.name ? `${value.name} (${value.dialCode})` : "Sélectionner un pays"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#1A1A1A] border-white/10 text-white">
        <Command className="bg-transparent">
          <CommandInput placeholder="Rechercher un pays..." className="text-white" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  // On concatène pour la recherche interne du CommandItem
                  value={country.name}
                  onSelect={() => {
                    // La double conversion (as unknown as Country) résout l'erreur de conflit de type
                    onChange(country as unknown as Country)
                    setOpen(false)
                  }}
                  className="hover:bg-white/10 cursor-pointer text-white"
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4", 
                      value?.code === country.code ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  {/* On force l'affichage du flag même si TS rale sur la source originale */}
                  <span className="text-lg mr-2">{(country as any).flag}</span>
                  {country.name} ({country.dialCode})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
