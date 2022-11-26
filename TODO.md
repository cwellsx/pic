# To do

The purpose of this list to delay until later what isn't needed immediately.

## Now

Minimal behaviour:

- Display thumbnails - renderer
- Read metadata - core
- Save metadata - main
- Display metadata - renderer

## Later

### More features

- Export
- Search
- Tags

### Docking

Use a layout manager with dockable panels -- for example:

- https://www.google.com/search?q=react+dockable+panels
- https://npm.io/package/flexlayout-react
- https://github.com/caplin/FlexLayout#alternative-layout-managers

### C++ instead of C#

Use C++ instead of C# to access the shell API:

- https://github.com/microsoft/Windows-classic-samples/tree/main/Samples/Win7Samples/winui/shell/appplatform/UsingImageFactory

This implies porting the `ElectronCgi.DotNet` package implementation to .NET which may be non-trivial, see also:

- https://www.tangiblesoftwaresolutions.com/product_details/csharp_to_cplusplus_converter_details.html

### File Extensions

- Discover at run-time which file extensions exist.
- Display the the list of file extensions
- Configure which extensions are included

## Done

Application template:

- Architecture
- Build tools
