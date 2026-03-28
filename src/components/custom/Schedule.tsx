"use client"

import * as React from "react"

import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"

export function Schedule() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date()
  )
  const bookedDates = [
    new Date(new Date().getFullYear(), 2, 12),
    new Date(new Date().getFullYear(), 2, 18),
    new Date(new Date().getFullYear(), 2, 21),
  ]

  return (
    <Card className="mx-auto w-fit p-5">
      <CardContent className="p-0">
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          disabled={bookedDates}
          modifiers={{
            booked: bookedDates,
          }}
          modifiersClassNames={{
            booked: "[&>button]:line-through opacity-100",
          }}
          components={{
            DayButton: ({ children, modifiers, day, ...props }) => {
              const isWeekend =
                day.date.getDay() === 0 || day.date.getDay() === 6
              return (
                <CalendarDayButton day={day} modifiers={modifiers} {...props} 
                  className={isWeekend ? "text-green-200" : undefined}
                >
                  {children}
                  {!modifiers.outside && (
                    <span>{bookedDates.some(date => date.getTime() === new Date(day.date).getTime()) ? "Booked" : "Available"}</span>
                  )}

                </CalendarDayButton>
              )
            },
          }}
        />
      </CardContent>
    </Card>
  )
}
