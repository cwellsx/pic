using System;
using System.IO;
using System.Globalization;

namespace Core
{
    static class Log
    {
        static StreamWriter file = File.AppendText("Core.log");
        static string Now() => DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fffK", CultureInfo.InvariantCulture);
        internal static void Write(string message) => file.Write($"{Now()}\t{message}\r\n");
        internal static void Close() => file.Close();
    }
}
