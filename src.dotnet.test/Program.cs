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
            @"C:\Users\Christopher\Videos\Test-Video.mp4",
            @"F:\!physio\New folder (2)\0091.mp4"
        };

        // sizes copied from https://github.com/microsoft/Windows-classic-samples/blob/main/Samples/Win7Samples/winui/shell/appplatform/UsingImageFactory/ImageFactorySample.cpp
        static (string, int)[] sizes = new[] {
            ("small", 16),
            ("mediuum", 48),
            ("large", 96),
            ("extralarge", 256)
        };

        static void Main(string[] args)
        {
            Directory.CreateDirectory("Output");
            foreach (var input in inputs)
            {
                foreach (var size in sizes.Select(it => it.Item2))
                {
                    var filename = Path.Combine("Output", Path.ChangeExtension($"{Path.GetFileNameWithoutExtension(input)}-{size}", "png"));
                    Core.Thumbnail.SaveThumbnail(path: input, thumbnailPath: filename, size);
                }
            }
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
