using Microsoft.WindowsAPICodePack.Shell.PropertySystem;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;

namespace Core
{
    static class Extensions
    {
        internal static string Name(string canonicalName)
        {
            if (canonicalName == null) return null;
            if (!canonicalName.StartsWith("System.")) return null;
            return canonicalName.Substring("System.".Length);
        }

        internal static bool IsNameWanted(string name)
        {
            if (name == null) return false;
            if (wanted.Contains(name)) return true;
            if (unwantedPrefix.Any(s => name.StartsWith(s))) return false;
            return true;
        }

        internal static string StringValue(VarEnum varEnumType, object valueAsObject)
        {
            // don't use the FormatForDisplay method because on my machine it sometimes returns different results from one run to the next
            var isArray = (varEnumType & VarEnum.VT_VECTOR) != 0;
            var converter = converters[varEnumType &= ~VarEnum.VT_VECTOR];
            if (valueAsObject == null) return "null";
            if (!isArray) return converter(valueAsObject);
            var array = (Array)valueAsObject;
            return $"[{string.Join(",", array.Cast<object>().Select(o => converter(o)))}]";
        }

        internal static bool IsSupported(VarEnum varEnumType)
        {
            varEnumType &= ~VarEnum.VT_VECTOR;
            return converters.ContainsKey(varEnumType);
        }

        static string[] wanted = new[]
         {
            "GPS.LatitudeDecimal",
            "GPS.LongitudeDecimal",
            "Image.HorizontalSize",
            "Image.VerticalSize",
            "Keywords",
            "Media.DateEncoded",
            "Media.DateReleased",
            "Media.Duration", // 100ns units, not milliseconds
            "Photo.CameraModel",
            "Photo.DateTaken",
            "Video.FrameHeight",
            "Video.FrameWidth"
        };

        static string[] unwantedPrefix = new[]
        {
            "App",
            "Audio",
            "ComputerName",
            "Date",
            "Document",
            "DRM",
            "File",
            "GPS",
            "Image",
            "Is",
            "Item",
            "Kind",
            "LastWriterPackageFamilyName",
            "Link",
            "Media",
            "MIMEType",
            "Network",
            "NotUserContent",
            "Offline",
            "Parsing",
            "PerceivedType",
            "Photo",
            "Security",
            "SFGAOFlags",
            "Shar",
            "Shell.SFGAOFlagsStrings",
            "Size",
            "SoftwareUsed",
            "Storage",
            "Sync",
            "ThumbnailCacheId",
            "Video",
            "ZoneIdentifier"
        };

        static DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        static Dictionary<VarEnum, Func<object, string>> converters = new Dictionary<VarEnum, Func<object, string>>
        {
            // not supported: VT_EMPTY, VT_NULL, VT_CLSID, VT_CF, VT_BLOB, VT_UNKNOWN, VT_STREAM
            { VarEnum.VT_UI1, o => Convert.ToString((byte)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_I2, o => Convert.ToString((short)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_UI2, o => Convert.ToString((ushort)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_I4, o => Convert.ToString((int)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_UI4, o => Convert.ToString((uint)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_I8, o => Convert.ToString((long)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_UI8, o => Convert.ToString((ulong)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_R8, o => Convert.ToString((double)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_BOOL, o => Convert.ToString((bool)o, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_FILETIME, o => Convert.ToString((((DateTime)o).ToUniversalTime() - epoch).TotalMilliseconds, System.Globalization.CultureInfo.InvariantCulture) },
            { VarEnum.VT_LPWSTR, o => $"\"{(string)o}\"" }
        };
    }
}
