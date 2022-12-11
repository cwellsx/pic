using System.Collections.Generic;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;

using Microsoft.WindowsAPICodePack.Shell;
using Microsoft.WindowsAPICodePack.Shell.PropertySystem;

// HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PropertySystem\SystemPropertyHandlers

namespace Core
{
    public static class Api
    {
        public static string SaveThumbnail(string path, string thumbnailPath, bool wantThumbnail, bool wantProperties, bool saveProperties = false)
        {
            Timer.Start("FromParsingName");
            using (var so = ShellObject.FromParsingName(path))
            {
                if (wantThumbnail) SaveThumbnail(so, thumbnailPath);

                if (!wantProperties) return null;

                var properties = ReadProperties(so);
                var result = string.Join("\r\n", properties.Select(property => $"{property.Item1}\t{property.Item2}"));
                if (saveProperties) File.WriteAllText(Path.ChangeExtension(thumbnailPath, "csv"), result);
                Timer.Start("FromParsingName.Dispose");
                return result;
            }
        }

        static void SaveThumbnail(ShellObject so, string thumbnailPath)
        {
            var shellThumbnail = so.Thumbnail;
            using (var bitmap = shellThumbnail.ExtraLargeBitmap)
            {
                bitmap.Save(thumbnailPath, ImageFormat.Jpeg);
            }
        }

        static IEnumerable<(string, string)> ReadProperties(ShellObject so)
        {
            Timer.Start("ShellPropertyCollection");
            using (var shellPropertyCollection = new ShellPropertyCollection(so))
            {
                var list = new List<(string, string)>();
                // according to measured Timer results, getting IShellProperty properties is expensive
                // and IShellProperty.ValueAsObject is the most expensive
                foreach (var shellProperty in shellPropertyCollection)
                {
                    Timer.Start("shellProperty.CanonicalName");
                    var name = Extensions.Name(shellProperty.CanonicalName);
                    if (!Extensions.IsNameWanted(name))
                        continue;
                    Timer.Start("shellProperty.Description.VarEnumType");
                    var varEnumType = shellProperty.Description.VarEnumType;
                    if (!Extensions.IsSupported(varEnumType))
                        continue;
                    Timer.Start("shellProperty.ValueAsObject");
                    var valueAsObject = shellProperty.ValueAsObject;
                    if (valueAsObject == null)
                        continue;
                    Timer.Start("StringValue");
                    var stringValue = Extensions.StringValue(varEnumType, valueAsObject);
                    list.Add((name, stringValue));
                }
                list.Sort((x, y) => (x.Item1 ?? string.Empty).CompareTo(y.Item1 ?? string.Empty));
                Timer.Start("ShellPropertyCollection.Dispose");
                return list;
            }
        }
    }
}
