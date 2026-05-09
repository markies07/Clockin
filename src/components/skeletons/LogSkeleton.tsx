export default function LogSkeleton() {
  const cols = [140, 60, 80, 80, 60, 80, 60, 60, 90, 80]

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 pb-24 lg:pb-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="animate-pulse rounded-xl bg-gray-100 h-7 w-40" />
          <div className="animate-pulse rounded-xl bg-gray-100 h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <div className="animate-pulse rounded-xl bg-gray-100 h-10 w-32" />
          <div className="animate-pulse rounded-xl bg-gray-100 h-10 w-32" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 min-w-max">
          {cols.map((w, i) => (
            <div key={i} className="animate-pulse rounded bg-gray-100 h-3" style={{ width: w }} />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4 border-b border-gray-50 items-center min-w-max">
            {cols.map((w, j) => (
              <div key={j} className={`animate-pulse bg-gray-100 ${j === 5 ? 'h-6 rounded-full' : 'h-4 rounded'}`} style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
