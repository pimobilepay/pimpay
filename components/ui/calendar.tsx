'use client'

import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: "ghost" | "outline" | "default" | "secondary" | "destructive" | "link"
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = 'ghost',
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background p-3',
        className
      )}
      classNames={{
        months: 'flex flex-col md:flex-row gap-4 relative',
        month: 'flex flex-col gap-4',
        caption: 'flex justify-center pt-1 relative items-center h-9',
        caption_label: 'text-sm font-medium select-none',
        nav: 'flex items-center gap-1 absolute top-0 inset-x-0 justify-between z-10',
        nav_button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex w-full',
        head_cell: 'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
        row: 'flex w-full mt-2',
        day: cn(
          buttonVariants({ variant: "ghost" }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 flex-1'
        ),
        day_range_start: 'day-range-start bg-primary text-primary-foreground rounded-l-md',
        day_range_end: 'day-range-end bg-primary text-primary-foreground rounded-r-md',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none',
        day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        day_hidden: 'invisible',
        ...classNames,
      }}
      // Utilisation des slots IconLeft et IconRight au lieu de Chevron
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
