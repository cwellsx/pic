using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core
{
    public static class Timer
    {
        static bool enabled = false;
        static Dictionary<string, double> total = new Dictionary<string, double>();
        static (string, DateTime)? started = null;
        static internal void Start(string message)
        {
            if (!enabled) return;
            if (started.HasValue) Stop();
            started = (message, DateTime.Now);
        }
        static void Stop()
        {
            if (started.HasValue)
            {
                var message = started.Value.Item1;
                var time = (DateTime.Now - started.Value.Item2).TotalMilliseconds;
                if (!total.TryGetValue(message, out double value))
                {
                    total.Add(message, time);
                }
                total[message] = value + time;
            }
            started = null;
        }
        public static void Enable() => enabled = true;
        public static string Log()
        {
            if (!enabled) throw new Exception("!Timer.enabled");
            var list = total.ToList();
            list.Sort((x, y) => y.Value.CompareTo(x.Value));
            return string.Join("\r\n", list.Select(kvp => $"{kvp.Value}\t{kvp.Key}"));
        }
    }
}
