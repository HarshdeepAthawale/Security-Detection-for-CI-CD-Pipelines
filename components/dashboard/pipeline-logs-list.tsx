"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Play, Eye, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface PipelineLog {
  filename: string
  pipelineName: string
  timestamp: string
  size: number
  modified: string
  error?: string
}

export function PipelineLogsList() {
  const [logs, setLogs] = useState<PipelineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingLog, setViewingLog] = useState<{ filename: string; data: any } | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPipelineLogs()
  }, [])

  const fetchPipelineLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pipeline-logs')
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline logs')
      }
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Error fetching pipeline logs:', error)
      toast({
        title: "Error",
        description: "Failed to load pipeline log files",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewLog = async (filename: string) => {
    try {
      const response = await fetch(`/api/pipeline-logs/${filename}`)
      if (!response.ok) {
        throw new Error('Failed to fetch log file')
      }
      const data = await response.json()
      setViewingLog({ filename, data: data.data })
      setViewDialogOpen(true)
    } catch (error) {
      console.error('Error fetching log file:', error)
      toast({
        title: "Error",
        description: "Failed to load pipeline log file",
        variant: "destructive",
      })
    }
  }

  const handleDownloadLog = async (filename: string) => {
    try {
      const response = await fetch(`/api/pipeline-logs/${filename}`)
      if (!response.ok) {
        throw new Error('Failed to fetch log file')
      }
      const data = await response.json()
      
      // Create a blob and download
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Downloaded",
        description: `Pipeline log "${filename}" downloaded successfully`,
      })
    } catch (error) {
      console.error('Error downloading log file:', error)
      toast({
        title: "Error",
        description: "Failed to download pipeline log file",
        variant: "destructive",
      })
    }
  }

  const handleProcessLog = async (filename: string) => {
    try {
      setProcessing(filename)
      const response = await fetch(`/api/pipeline-logs/${filename}/process`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process log')
      }
      
      const data = await response.json()
      
      toast({
        title: "Success",
        description: data.message || `Pipeline log "${filename}" processed successfully`,
      })
      
      // Refresh the page to show the new analysis in history
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error processing log file:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process pipeline log file",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pipeline Log Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pipeline Log Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No pipeline log files found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Pipeline Log Files ({logs.length})</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPipelineLogs}
              className="text-xs"
            >
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.filename}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {log.pipelineName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {log.filename}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(log.size)}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewLog(log.filename)}
                    className="h-8 px-2"
                    title="View log"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadLog(log.filename)}
                    className="h-8 px-2"
                    title="Download log"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleProcessLog(log.filename)}
                    disabled={processing === log.filename}
                    className="h-8 px-2"
                    title="Process and add to history"
                  >
                    {processing === log.filename ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Log Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {viewingLog?.filename || 'Pipeline Log'}
            </DialogTitle>
            <DialogDescription>
              View and inspect the pipeline log JSON data
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {viewingLog && (
              <pre className="p-4 bg-secondary/30 rounded-lg text-xs font-mono overflow-auto">
                {JSON.stringify(viewingLog.data, null, 2)}
              </pre>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (viewingLog) {
                  handleDownloadLog(viewingLog.filename)
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (viewingLog) {
                  handleProcessLog(viewingLog.filename)
                  setViewDialogOpen(false)
                }
              }}
              disabled={processing === viewingLog?.filename}
            >
              {processing === viewingLog?.filename ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Process
            </Button>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
