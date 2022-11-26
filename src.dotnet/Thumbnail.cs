using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.Versioning;

/*
 * I tried to implement this using https://github.com/rlv-dan/ShellThumbs to create a bitmap
 * plus https://stackoverflow.com/questions/30727343/fast-converting-bitmap-to-bitmapsource-wpf to convert to a BitmapSource
 * but that resulted in a black-and-white bitmap for some reason that I didn't debug
 * so instead I made this simpler version which saves the Bitmap to a file.
 */

namespace Core
{
    [SupportedOSPlatform("windows")]
    public static class Thumbnail
    {
        public static void SaveThumbnail(string path, string thumbnailPath, int size = 256, ImageFormat imageFormat = null)
        {
            Action<Bitmap> save = (bitmap) => bitmap.Save(thumbnailPath, imageFormat ?? ImageFormat.Png);
            WindowsThumbnailProvider.SaveThumbnail(path, size, size, ThumbnailOptions.BiggerSizeOk, save);
        }
    }
}
