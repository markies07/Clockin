import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Greeting */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Payroll strip */}
      <Skeleton className="h-11 w-full rounded-2xl" />

      {/* Calendar + Time panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-1 mt-2">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-5" />)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
          </div>
        </div>

        {/* Time panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex justify-between items-end">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex justify-between px-5 py-4 border-b border-gray-50">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
