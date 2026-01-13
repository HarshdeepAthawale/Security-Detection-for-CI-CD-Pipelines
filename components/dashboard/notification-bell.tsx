"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "security" | "drift" | "success"
  title: string
  message: string
  timestamp: string
  read: boolean
  pipeline?: string
  driftScore?: number
  riskLevel?: string
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const POLL_INTERVAL = 10000 // Poll every 10 seconds

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const lastCheckedRef = useRef<Date>(new Date())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch recent analyses and convert to notifications
  const fetchNotifications = async () => {
    try {
      const since = lastCheckedRef.current.toISOString()
      const response = await fetch(
        `/api/history?limit=20&since=${encodeURIComponent(since)}`
      )

      if (!response.ok) {
        console.error("Failed to fetch notifications")
        return
      }

      const data = await response.json()
      const history = data.history || []

      // Convert analyses to notifications
      const newNotifications: Notification[] = history
        .filter((analysis: any) => {
          // Only show high-risk or significant drift
          return (
            analysis.riskLevel === "high" ||
            analysis.riskLevel === "critical" ||
            (analysis.driftScore && analysis.driftScore > 0.7)
          )
        })
        .map((analysis: any) => ({
          id: analysis.id || `${analysis.pipeline}-${analysis.timestamp}`,
          type:
            analysis.riskLevel === "critical" || analysis.riskLevel === "high"
              ? "security"
              : analysis.driftScore > 0.7
              ? "drift"
              : "success",
          title:
            analysis.riskLevel === "critical"
              ? "Critical Security Issue Detected"
              : analysis.riskLevel === "high"
              ? "High Risk Security Issue"
              : "Significant Drift Detected",
          message: `Pipeline "${analysis.pipeline || "Unknown"}" has a drift score of ${(
            analysis.driftScore * 100
          ).toFixed(1)}%`,
          timestamp: analysis.timestamp || new Date().toISOString(),
          read: false,
          pipeline: analysis.pipeline,
          driftScore: analysis.driftScore,
          riskLevel: analysis.riskLevel,
        }))

      if (newNotifications.length > 0) {
        setNotifications((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map((n) => n.id))
          const uniqueNew = newNotifications.filter(
            (n) => !existingIds.has(n.id)
          )
          
          // Update unread count for new notifications
          if (uniqueNew.length > 0) {
            setUnreadCount((count) => count + uniqueNew.length)
          }
          
          return [...uniqueNew, ...prev].slice(0, 50) // Keep last 50 notifications
        })
      }

      // Update last checked time
      lastCheckedRef.current = new Date()
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  // Start polling for notifications
  useEffect(() => {
    // Initial fetch
    fetchNotifications()

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications()
    }, POLL_INTERVAL)

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Mark notifications as read when popover opens
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    }
  }, [isOpen, unreadCount])

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "security":
        return (
          <AlertTriangle className="h-4 w-4 text-foreground flex-shrink-0" />
        )
      case "drift":
        return <AlertTriangle className="h-4 w-4 text-foreground flex-shrink-0" />
      case "success":
        return (
          <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No notifications
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll be notified about security issues and drift detection
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-secondary/50 transition-colors cursor-pointer",
                    !notification.read && "bg-secondary/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.pipeline && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Pipeline: {notification.pipeline}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
