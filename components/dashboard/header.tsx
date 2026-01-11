"use client"

import { Shield, Bell, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Security Detection for CI/CD Pipelines</span>
          </div>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Beta</span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-foreground">
            Overview
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Pipelines
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            History
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Settings
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                Production
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Production</DropdownMenuItem>
              <DropdownMenuItem>Staging</DropdownMenuItem>
              <DropdownMenuItem>Development</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
