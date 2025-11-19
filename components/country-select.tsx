"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { countries, type Country } from "@/lib/country-data"

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
          className="w-full justify-between mt-1.5 bg-transparent"
        >
          <span className="truncate flex items-center gap-2">
            <span className="text-xl">{value.flag}</span>
            {value.name} ({value.dialCode})
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Rechercher un pays..." />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.dialCode}`}
                  onSelect={() => {
                    onChange(country)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value.code === country.code ? "opacity-100" : "opacity-0")} />
                  <span className="text-lg mr-2">{country.flag}</span>
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
