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
                Core.Api.SaveThumbnail(path: input, thumbnailPath: filename, true, true, true);
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
