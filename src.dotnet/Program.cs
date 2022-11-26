using ElectronCgi.DotNet;
using System;
using System.Drawing.Imaging;
using System.Runtime.Versioning;

namespace Core
{
    // according to https://github.com/ruidfigueiredo/electron-cgi-calculator-demo the C# field names are Pascal case and the JS are lower case
    class ThumbnailRequest
    {
        public string Path { get; set; }
        public string ThumbnailPath { get; set; }
    }
    [SupportedOSPlatform("windows")]
    class Program
    {
        static void Main(string[] args)
        {
            Console.Error.WriteLine("Core starting");
             
            var connection = new ConnectionBuilder()
                .WithLogging()
                .Build();

            connection.On<string, string>("getGreeting", name => {
                var response = "Hello " + name;
                Console.Error.WriteLine(response);
                return response;
            });

            connection.On<ThumbnailRequest, bool>("createThumbnail", request => {
                try
                {
                    Thumbnail.SaveThumbnail(request.Path, request.ThumbnailPath);
                    return true;
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine(ex.ToString());
                    return false;
                }
            });

            connection.Listen();
        }
    }
}
