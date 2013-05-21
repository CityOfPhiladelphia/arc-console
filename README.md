ArcConsole
=========

ArcConsole is a simple, intuitive console for the ArcGIS Server REST API. It's intended for people not familiar with the
ArcGIS REST API or users that want to get their data quickly and move on with their application. It does this by making some
decisions for you, like for instance since you're on the internet the spatial reference you're using is probably
WGS 84 (4326). It also uses JavaScript libraries like [Chosen] (http://harvesthq.github.com/chosen) and [Leaflet Draw] (https://github.com/Leaflet/Leaflet.draw) to help you construct your query parameters how you need them.  

[(Demo)] (http://cityofphiladelphia.github.io/arc-console)

It is still a work in progress and we would love to here from developers and other users on how this application can be
improved. Feel free to open issues for requested features/bugs.

Future Improvements
===================

+ Richer information on each available service
+ A complete query builder to make constructing WHERE statements easier
+ Ability to export selected data to .csv file or shapefile
+ Inline explanation for each spatial relationship
+ Input validation
+ Ability to optionally select a different spatial reference
