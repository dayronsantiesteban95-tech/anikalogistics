import { useEffect, useState } from "react";
import { TIMEZONES } from "@/lib/constants";
import { Truck } from "lucide-react";

function formatTime(timezone: string) {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function GlobalHeader() {
  const [times, setTimes] = useState(
    TIMEZONES.map((tz) => ({ ...tz, time: formatTime(tz.timezone) }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimes(TIMEZONES.map((tz) => ({ ...tz, time: formatTime(tz.timezone) })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Truck className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          Anika<span className="text-accent"> Logistics</span>
        </span>
      </div>
      <div className="flex items-center gap-6">
        {times.map((tz) => (
          <div key={tz.city} className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {tz.city}
            </span>
            <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
              {tz.time}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}
