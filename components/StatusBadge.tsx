import type { CarStatus } from "@/lib/carTypes";
import { statusLabels, statusTone } from "@/lib/carTypes";

export function StatusBadge({ status }: { status: CarStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
