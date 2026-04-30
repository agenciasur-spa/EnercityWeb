import type { TimelineEntry } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon, MessageSquareIcon, UserIcon } from 'lucide-react';

interface TimelineProps {
  entries: TimelineEntry[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}

function formatRelativeTime(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour}h`;
  if (diffDay < 30) return `hace ${diffDay}d`;
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEntryEmail(entry: TimelineEntry): string | null {
  if (entry.type === 'status_change') return entry.changed_by_email;
  return entry.created_by_email;
}

function Timeline({ entries, statusLabels, statusColors }: TimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No hay actividad registrada
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="relative flex flex-col items-center">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
              entry.type === 'status_change'
                ? 'border-[#154660] bg-[#154660]/10'
                : 'border-green-600 bg-green-50'
            }`}>
              {entry.type === 'status_change' ? (
                <ArrowRightIcon className="h-4 w-4 text-[#154660]" />
              ) : (
                <MessageSquareIcon className="h-4 w-4 text-green-600" />
              )}
            </div>
            {entries.indexOf(entry) < entries.length - 1 && (
              <div className="absolute top-9 bottom-0 w-px bg-border" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            {entry.type === 'status_change' ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">De</span>
                  {entry.from_status ? (
                    <Badge variant="outline" className={statusColors[entry.from_status] ?? ''}>
                      {statusLabels[entry.from_status] ?? entry.from_status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                      —
                    </Badge>
                  )}
                  <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className={statusColors[entry.to_status] ?? ''}>
                    {statusLabels[entry.to_status] ?? entry.to_status}
                  </Badge>
                </div>
                {entry.notas && (
                  <p className="text-sm text-muted-foreground">{entry.notas}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
              </div>
            )}

            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {getEntryEmail(entry) ? (
                <>
                  <UserIcon className="h-3 w-3" />
                  <span>{getEntryEmail(entry)}</span>
                </>
              ) : (
                <span className="italic">Sistema</span>
              )}
              <span>·</span>
              <span title={formatFullDate(entry.created_at)}>
                {formatRelativeTime(entry.created_at)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { Timeline };
export default Timeline;