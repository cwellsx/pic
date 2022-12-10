# To do

The purpose of this list to delay until later what isn't needed immediately.

## Now

Minimal behaviour:

- Save properties - main
- Display properties - renderer
- Sort by properties - renderer
- Group by properties - renderer
- Filter by properties - renderer
- Add tags - renderer + main

Performance

- Implement isFresh to read each directory only once after start-up

## Later

### More Shell integration

Implement more functionality that's normally available in Explorer:

- Export
  - Select multiple files
  - Copy to a temp directory
  - Send to email
- Launch file in editor or viewer

### Edit video thumbnails

Choose the location from which the thumbnail is extracted, maybe by using a `<video>` element.

### Docking

Use a layout manager with dockable panels -- for example:

- https://www.google.com/search?q=react+dockable+panels
- https://npm.io/package/flexlayout-react
- https://github.com/caplin/FlexLayout#alternative-layout-managers

### File extensions

- Discover at run-time which file extensions exist.
- Display the the list of file extensions
- Configure which extensions are included

### Packing

- Package the .NET code so that it runs on any machine -- https://learn.microsoft.com/en-us/dotnet/core/deploying/

### Reverse geocoding

- Implement reverse geocoding to convert photo GPS coordinates to a place name
- Or support a database table of user-defined places
