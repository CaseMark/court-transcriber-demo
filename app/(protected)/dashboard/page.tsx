'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { listRecordings, deleteRecording } from '@/lib/storage';
import type { Recording } from '@/types/recording';
import {
  Plus,
  MagnifyingGlass,
  FileAudio,
  Trash,
  Clock,
  CheckCircle,
  Spinner,
  Warning,
  FolderOpen,
} from '@phosphor-icons/react';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusBadge(status: Recording['status']) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-green-700 text-white gap-1">
          <CheckCircle className="h-3 w-3" weight="fill" />
          Completed
        </Badge>
      );
    case 'processing':
    case 'transcribing':
      return (
        <Badge className="bg-amber-600 text-white gap-1">
          <Spinner className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1">
          <Warning className="h-3 w-3" weight="fill" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Uploading
        </Badge>
      );
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecordings() {
      setIsLoading(true);
      const result = await listRecordings();
      setRecordings(result);
      setIsLoading(false);
    }

    loadRecordings();
  }, []);

  const filteredRecordings = recordings.filter((recording) =>
    recording.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    setDeletingId(id);
    await deleteRecording(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="px-4 py-8 md:px-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold leading-tight">Recordings</h1>
            <p className="text-sm text-muted-foreground leading-tight">
              Manage your court transcriptions
            </p>
          </div>
          <Link href="/upload" className={cn(buttonVariants(), "flex-shrink-0")}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Recording
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Recordings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold">No recordings found</h3>
                <p className="text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">No recordings yet</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Upload your first court recording to get started
                </p>
                <Link href="/upload" className={cn(buttonVariants())}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Upload Recording
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="divide-y">
              {filteredRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileAudio className="h-5 w-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => router.push(`/recording/${recording.id}`)}
                      className="text-left hover:underline"
                    >
                      <h3 className="font-medium truncate">{recording.name}</h3>
                    </button>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span>{formatDate(recording.uploadedAt)}</span>
                      <span className="hidden md:inline">
                        {formatFileSize(recording.fileSize)}
                      </span>
                      {recording.duration > 0 && (
                        <span className="hidden md:inline">
                          {formatDuration(recording.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="hidden sm:block">
                    {getStatusBadge(recording.status)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {recording.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/recording/${recording.id}`)}
                      >
                        View
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(recording.id)}
                      disabled={deletingId === recording.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === recording.id ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
