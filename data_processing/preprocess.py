# This script preprocesses shapefiles into a texture map.

import os
import shapefile

polygons = [] # List of polygons. Each polygon is a list of points, [(x1, y1), (x2, y2), ...].

data_dir = 'data_processing/data/'
for file in os.listdir(data_dir):
    if file.endswith(".shp"):
        # Open the shapefile.
        sf = shapefile.Reader(data_dir + file)
        # Get the shapefile's geometry.
        shapes = sf.shapes()
        # Get the shapefile's attributes.
        attributes = sf.records()
        # Get the shapefile's fields.
        fields = sf.fields

        # Print a summary of the shapefile.
        print("Shapefile: " + file)
        print("Number of shapes: " + str(len(shapes)))
        #print("Fields", fields)

        # Iterate through all shapes in the shapefile.
        for i in range(len(shapes)):
            # Get the shape's geometry.
            shape = shapes[i]

            polygons.append(shape.points)

        # break # TODO: Remove this break statement.

print("Total number of polygons: " + str(len(polygons)))
print("Total number of points: " + str(sum([len(polygon) for polygon in polygons])))

# Dump the polygons to gziped JSON.
# https://stackoverflow.com/questions/39450065/python-3-read-write-compressed-json-objects-from-to-gzip-file

output_file = 'data_processing/polygons.json.gz'
import json
import gzip
with gzip.open(output_file, 'wt', encoding='utf-8') as zipfile:
    json.dump(polygons, zipfile)

# Read the polygons from gziped JSON.
with gzip.open(output_file, 'rt', encoding='utf-8') as zipfile:
    polygons = json.load(zipfile)
    print("Total number of polygons: " + str(len(polygons)))