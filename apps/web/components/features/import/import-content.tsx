'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@workspace/ui';
import { FileDropzone } from './file-dropzone';
import { ImportPreview } from './import-preview';
import {
  parseChatGPTExport,
  type ParseResult,
} from '@/lib/parsers/chatgpt';

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

interface ImportResult {
  conversationsReceived: number;
  conversationsImported: number;
}

export function ImportContent() {
  const router = useRouter();
  const [state, setState] = useState<ImportState>('idle');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((content: string) => {
    setState('parsing');
    setError(null);

    // Use setTimeout to allow UI to update before parsing large files
    setTimeout(() => {
      try {
        const result = parseChatGPTExport(content);

        if (result.conversations.length === 0) {
          setError(
            result.errors[0] ?? 'No valid conversations found in the file'
          );
          setState('error');
          return;
        }

        setParseResult(result);
        setState('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
        setState('error');
      }
    }, 0);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;

    setState('importing');
    setError(null);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversations: parseResult.conversations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data.data);
      setState('done');
      toast.success(
        `Successfully imported ${data.data.conversationsImported} conversations`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setState('error');
      toast.error('Import failed');
    }
  }, [parseResult]);

  const handleReset = useCallback(() => {
    setState('idle');
    setParseResult(null);
    setImportResult(null);
    setError(null);
  }, []);

  const handleViewTimeline = useCallback(() => {
    router.push('/timeline');
  }, [router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Chat History</CardTitle>
        <CardDescription>
          Import your chat conversations from external services
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Idle state - show dropzone */}
        {state === 'idle' && (
          <FileDropzone onFileSelect={handleFileSelect} />
        )}

        {/* Parsing state */}
        {state === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Parsing file...
            </p>
          </div>
        )}

        {/* Preview state */}
        {state === 'preview' && parseResult && (
          <div className="space-y-4">
            <ImportPreview
              conversations={parseResult.summary}
              errors={parseResult.errors}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {parseResult.conversations.length} conversations
              </Button>
            </div>
          </div>
        )}

        {/* Importing state */}
        {state === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Importing conversations...
            </p>
          </div>
        )}

        {/* Done state */}
        {state === 'done' && importResult && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle className="size-8 text-primary" />
            </div>
            <p className="mt-4 text-lg font-medium">Import complete</p>
            <p className="text-sm text-muted-foreground">
              {importResult.conversationsImported} of{' '}
              {importResult.conversationsReceived} conversations imported
            </p>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Import more
              </Button>
              <Button onClick={handleViewTimeline}>View Timeline</Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <p className="mt-4 text-lg font-medium">Import failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>

            <Button variant="outline" onClick={handleReset} className="mt-6">
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
