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
            using (var so = ShellObject.FromParsingName(path))
            {
                if (wantThumbnail) SaveThumbnail(so, thumbnailPath);

                if (!wantProperties) return null;

                var properties = ReadProperties(so);
                var result = string.Join("\r\n", properties.Select(property => $"{property.Item1}\t{property.Item2}"));
                if (saveProperties) File.WriteAllText(Path.ChangeExtension(thumbnailPath, "csv"), result);
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

        /*
         * Interesting properties include
         * - System.Keywords
         * - System.Rating
         * - System.RatingText
         */

        static IEnumerable<(string, string)> ReadProperties(ShellObject so)
        {
            //using (var shellProperties = so.Properties)
            //{
            //    var propertySystem = shellProperties.System;
            //    var propertySystemVideo = propertySystem.Video;
            //    var frameWidth = propertySystemVideo.FrameWidth.Value;
            //}

            using (var shellPropertyCollection = new ShellPropertyCollection(so))
            {
                var list = shellPropertyCollection.Where(Extensions.IsWanted).Select(shellProperty => (shellProperty.Name(), shellProperty.StringValue())).ToList();
                list.Sort((x, y) => (x.Item1 ?? string.Empty).CompareTo(y.Item1 ?? string.Empty));
                return list;
            }
        }
    }
}
