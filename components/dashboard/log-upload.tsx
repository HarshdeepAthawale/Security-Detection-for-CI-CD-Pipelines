"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"

interface LogUploadDialogProps {
  children?: React.ReactNode
}

interface ValidationError {
  field?: string
  message: string
}

export function LogUploadDialog({ children }: LogUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("file")
  const [jsonInput, setJsonInput] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<ValidationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const validateLogFormat = (log: any): ValidationError | null => {
    // Check if it's an object
    if (!log || typeof log !== "object" || Array.isArray(log)) {
      return { message: "Log must be a JSON object" }
    }

    // Check required fields
    if (!log.pipeline || typeof log.pipeline !== "string") {
      return { field: "pipeline", message: "Missing or invalid 'pipeline' field (must be a string)" }
    }

    if (!log.timestamp || typeof log.timestamp !== "string") {
      return { field: "timestamp", message: "Missing or invalid 'timestamp' field (must be an ISO 8601 string)" }
    }

    // Validate timestamp format (basic check)
    try {
      new Date(log.timestamp)
    } catch {
      return { field: "timestamp", message: "Invalid timestamp format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00.000Z)" }
    }

    if (!log.steps || !Array.isArray(log.steps)) {
      return { field: "steps", message: "Missing or invalid 'steps' field (must be an array)" }
    }

    if (log.steps.length === 0) {
      return { field: "steps", message: "Steps array cannot be empty" }
    }

    // Validate each step
    for (let i = 0; i < log.steps.length; i++) {
      const step = log.steps[i]
      if (!step || typeof step !== "object") {
        return { field: `steps[${i}]`, message: `Step ${i + 1} must be an object` }
      }

      if (!step.name || typeof step.name !== "string") {
        return { field: `steps[${i}].name`, message: `Step ${i + 1} is missing or has invalid 'name' field` }
      }

      if (!step.type || typeof step.type !== "string") {
        return { field: `steps[${i}].type`, message: `Step ${i + 1} is missing or has invalid 'type' field` }
      }

      if (!step.permissions || !Array.isArray(step.permissions)) {
        return { field: `steps[${i}].permissions`, message: `Step ${i + 1} is missing or has invalid 'permissions' field (must be an array)` }
      }

      if (step.executionOrder === undefined || typeof step.executionOrder !== "number") {
        return { field: `steps[${i}].executionOrder`, message: `Step ${i + 1} is missing or has invalid 'executionOrder' field (must be a number)` }
      }
    }

    return null
  }

  const parseAndValidate = (content: string): { log: any; error: ValidationError | null } => {
    try {
      const log = JSON.parse(content)
      const error = validateLogFormat(log)
      return { log, error }
    } catch (e) {
      return {
        log: null,
        error: {
          message: `Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
        },
      }
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setValidationError(null)
      return
    }

    // Check file extension
    if (!file.name.endsWith(".json")) {
      setValidationError({
        message: "Please select a JSON file (.json extension)",
      })
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setValidationError(null)

    // Read and validate file content
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const { error } = parseAndValidate(content)
        if (error) {
          setValidationError(error)
        } else {
          setValidationError(null)
        }
      } catch (err) {
        setValidationError({
          message: `Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`,
        })
      }
    }
    reader.onerror = () => {
      setValidationError({
        message: "Failed to read file. Please try again.",
      })
    }
    reader.readAsText(file)
  }

  const handleJsonInputChange = (value: string) => {
    setJsonInput(value)
    if (value.trim()) {
      const { error } = parseAndValidate(value)
      setValidationError(error)
    } else {
      setValidationError(null)
    }
  }

  const getLogData = async (): Promise<any | null> => {
    if (activeTab === "file") {
      if (!selectedFile) {
        setValidationError({ message: "Please select a file" })
        return null
      }

      try {
        const content = await selectedFile.text()
        const { log, error } = parseAndValidate(content)
        if (error) {
          setValidationError(error)
          return null
        }
        return log
      } catch (err) {
        setValidationError({
          message: `Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`,
        })
        return null
      }
    } else {
      if (!jsonInput.trim()) {
        setValidationError({ message: "Please paste or enter JSON data" })
        return null
      }

      const { log, error } = parseAndValidate(jsonInput)
      if (error) {
        setValidationError(error)
        return null
      }
      return log
    }
  }

  const handleSubmit = async () => {
    setValidationError(null)
    setIsLoading(true)

    try {
      const log = await getLogData()
      if (!log) {
        setIsLoading(false)
        return
      }

      // Submit to API
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: log.pipeline,
          log: log,
          timestamp: log.timestamp,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Analysis failed")
      }

      // Success
      toast({
        title: "Analysis Complete",
        description: `Pipeline "${log.pipeline}" analyzed successfully. Drift score: ${data.driftScore}`,
      })

      // Close dialog and reset
      setOpen(false)
      setJsonInput("")
      setSelectedFile(null)
      setValidationError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Force immediate refresh of the dashboard
      // Wait a moment for backend to store data, then refresh
      setTimeout(() => {
        // Use router.refresh() to re-fetch server components with fresh data
        // Since cache is disabled, this will fetch the latest data
        router.refresh()
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setValidationError({
        message: errorMessage,
      })
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      // Reset state when closing
      setJsonInput("")
      setSelectedFile(null)
      setValidationError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Analyze Pipeline
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] !grid !grid-rows-[auto_1fr_auto]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Upload CI/CD Log</DialogTitle>
          <DialogDescription>
            Upload a CI/CD pipeline log file or paste JSON data to analyze for security drift.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">
                <FileText className="mr-2 h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="json">JSON Paste</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="file-input" className="text-sm font-medium">
                  Select JSON File
                </label>
                <Input
                  id="file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  disabled={isLoading}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="json" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="json-input" className="text-sm font-medium">
                  Paste JSON Data
                </label>
                <Textarea
                  id="json-input"
                  placeholder='{"pipeline": "my-pipeline", "timestamp": "2024-01-15T10:00:00.000Z", "steps": [...]}'
                  value={jsonInput}
                  onChange={(e) => handleJsonInputChange(e.target.value)}
                  disabled={isLoading}
                  className="min-h-[200px] max-h-[300px] font-mono text-sm overflow-y-auto"
                />
                <p className="text-xs text-muted-foreground">
                  Expected format: pipeline name, timestamp (ISO 8601), and steps array with name, type, permissions, and executionOrder.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {validationError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Error</AlertTitle>
              <AlertDescription>
                {validationError.field && (
                  <span className="font-medium">{validationError.field}: </span>
                )}
                {validationError.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !!validationError}>
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Analyzing...
              </>
            ) : (
              "Analyze"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
