using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Versioning;

namespace Test
{
    [SupportedOSPlatform("windows")]
    class Program
    {
        static string[] inputs = new[]
        {
            @"C:\Users\Christopher\Pictures\Desk\IMG_8911.JPG",
            @"C:\Users\Christopher\Videos\Test-Video.mp4"
        };

        static void Main(string[] args)
        {
            Directory.CreateDirectory("Output");
            foreach (var input in inputs)
            {
                var filename = Path.Combine("Output", Path.ChangeExtension($"{Path.GetFileNameWithoutExtension(input)}", "jpg"));
                Core.Api.SaveThumbnail(path: input, thumbnailPath: filename, false, true, true);
            }
            TestPerformance();
        }

        private static void TestPerformance()
        {
            Core.Timer.Enable();
            var files = GetFiles(@"C:\Users\Christopher\Documents").Where(isWanted).ToList();
            var start = DateTime.Now;
            foreach (var input in files)
            {
                Core.Api.SaveThumbnail(path: input, thumbnailPath: "", false, true, false);
            }
            Console.WriteLine($"{files.Count} files in {(DateTime.Now - start).TotalSeconds} seconds");
            var log = Core.Timer.Log();
            File.WriteAllText("Core.Timer.log", log);
        }

        private static IEnumerable<string> GetFiles(string directory)
        {
            // This throws an exception "Access to the path 'C:\\Users\\Christopher\\Documents\\My Music' is denied."
            // var files = Directory.GetFiles(@"C:\Users\Christopher\Documents", "*.*", SearchOption.AllDirectories);
            var result = Directory.GetFiles(directory).ToList();
            var directoryInfo = new DirectoryInfo(directory);
            foreach (var subdirectory in directoryInfo.EnumerateDirectories().Where(x => !x.Attributes.HasFlag(FileAttributes.Hidden)).Select(x => x.FullName))
            {
                if (Path.GetFileName(subdirectory) == ".pic") continue;
                result.AddRange(GetFiles(subdirectory));
            }
            return result;
        }

        static string[] images = new[] { "jpg", "jpeg", "jpe", "jfif", "gif", "tif", "tiff", "bmp", "dib", "png", "ico", "heic", "webp" };
        static string[] videos = new[] { "mp4", "wmv", "flv", "avi", "mpg", "mpeg", "mkv", "ts" };
        static HashSet<string> extensions = new HashSet<string>(images.Concat(videos));


        private static bool isWanted(string path)
        {
            if (Path.GetDirectoryName(path).Contains(".pic")) return false;
            var extension = Path.GetExtension(path);
            return !string.IsNullOrEmpty(extension) && extensions.Contains(extension.Substring(1));
        }

        /*
         * Tests show that file size is approx:
         * 
         * Video, 256 JPG: 6 KB
         * Video, 256 PNG: 60 .. 90 KB
         * 
         * Image, 256 JPG: 11 KB
         * Image, 256 PNG: 124 KB
         * 
         * So 256 JPG is the best default.
         */
    }
}
