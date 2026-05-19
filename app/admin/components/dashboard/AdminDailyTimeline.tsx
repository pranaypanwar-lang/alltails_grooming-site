type Props = {
  data: { hour: number; count: number }[];
};

export function AdminDailyTimeline({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const now = new Date();
  const currentHour = now.getHours();

  const fmt = (h: number) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  return (
    <div>
      <div className="mb-3 flex items-end gap-1" style={{ height: 56 }}>
        {data.map(({ hour, count }) => {
          const heightPct = (count / maxCount) * 100;
          const isPast = hour < currentHour;
          const isCurrent = hour === currentHour;
          return (
            <div
              key={hour}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
            >
              <div
                className={`w-full rounded-t-[3px] transition-all ${
                  isCurrent
                    ? "bg-[#6d5bd0]"
                    : isPast
                    ? "bg-[#ddd6fe]"
                    : "bg-[#ede9fe]"
                }`}
                style={{ height: count === 0 ? 2 : `${heightPct}%` }}
              />
              {count > 0 && (
                <div className="pointer-events-none absolute -top-6 hidden rounded-[6px] bg-[#1f1f2c] px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:block">
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Hour labels — show every 2nd hour to avoid crowding */}
      <div className="flex gap-1">
        {data.map(({ hour }) => (
          <div
            key={hour}
            className={`flex-1 text-center text-[9px] ${
              hour === currentHour ? "font-bold text-[#6d5bd0]" : "text-[#9ca3af]"
            }`}
          >
            {hour % 2 === 0 ? fmt(hour) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
