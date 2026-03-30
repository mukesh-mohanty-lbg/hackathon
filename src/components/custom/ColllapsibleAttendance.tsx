"use client"

import { CheckCircle2, ChevronDownIcon, ChevronRight, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import React from "react"
import { ProgressBar } from "./ProgressBar"

export function CollapsibleAttendance({ event, instance, isIndividual, instanceId, onNavigate }: { event: any, instance: any, isIndividual: boolean, instanceId: string, onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Card className="w-full">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="flex flex-col mx-4"
      >
        <div className="flex items-center justify-between gap-4 px-4">
          <h4 className="text-sm font-semibold mb-2">Registrations</h4>

        </div>
        <div className="flex items-center justify-between rounded-md border px-4 py-4 text-sm">
            <ProgressBar label={'Capacity'} labeledValue={`${instance.attendees.length} / ${event.maxAttendees} occupied`} value={(instance.attendees.length / event.maxAttendees) * 100} />
          
          <div>

            <span className="font-medium">{instance.status !== 'completed' && !isIndividual && (
              <Button size="sm" variant="outline" onClick={() => onNavigate('attendance', { instanceId })} className="gap-2">
                <CheckCircle2 className="size-4" />Take Attendance<ChevronRight className="size-4" />
              </Button>
            )}</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <ChevronsUpDown />
                <span className="sr-only">Toggle details</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="flex flex-col gap-2">
          <CardContent className="px-2 border">
            <ul className="divide-y divide-border">
              {instance.attendees.map(a => (
                <li key={a.youngPersonId} className="flex items-center justify-between gap-3 py-4 w-full">
                  <div className="flex items-center gap-6 px-2">
                    <span className="text-sm font-semibold flex-1">{a.youngPersonId} </span>
                    <div>
                      <span className="text-sm font-semibold flex-1">{a.name}</span>
                    </div>
                  </div>
                  {a.present === null ? <Badge variant="outline" className="text-xs">Pending</Badge>
                    : a.present ? <Badge variant="success" className="text-xs">Present</Badge>
                      : <Badge variant="destructive" className="text-xs">Absent</Badge>}

                </li>
              ))}
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
