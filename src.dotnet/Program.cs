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
        public bool WantThumbnail { get; set; }
        public bool WantProperties { get; set; }
    }

    class ThumbnailResponse
    {
        public string Properties { get; set; }
        public string Exception { get; set; }
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

            connection.On<string, string>("getGreeting", name =>
            {
                var response = "Hello " + name;
                Console.Error.WriteLine(response);
                return response;
            });

            connection.On<ThumbnailRequest, ThumbnailResponse>("createThumbnail", request =>
            {
                try
                {
                    var properties = Api.SaveThumbnail(request.Path, request.ThumbnailPath, request.WantThumbnail, request.WantProperties);
                    return new ThumbnailResponse { Properties = properties };
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine(ex.ToString());
                    return new ThumbnailResponse { Exception = ex.ToString() };
                }
            });

            connection.Listen();
        }
    }
}
