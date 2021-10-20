# This script preprocesses shapefiles into a texture map.

import os
import shapefile
from tqdm import tqdm
import matplotlib.pyplot as plt

def read_polygons(data_dir='data_processing/gshhg-shp-2.3.7/GSHHS_shp/f/'):
    polygons = [] # List of polygons. Each polygon is a list of points, [(x1, y1), (x2, y2), ...].
    for file in os.listdir(data_dir):
        if file.endswith(".shp"):
        # Open the shapefile.
            sf = shapefile.Reader(data_dir + file)
        # Get the shapefile's geometry.
            shapes = sf.shapes()

        # Print a summary of the shapefile.
            print("Shapefile: " + file)
            print("Number of shapes: " + str(len(shapes)))
        #print("Fields", fields)

        # Iterate through all shapes in the shapefile.
            for i in range(len(shapes)):
            # Get the shape's geometry.
                shape = shapes[i]

                polygons.append(shape.points)

    return polygons


# Convert latitude and longitude to square coordinates.
def get_square(lat, long, precision, verbose=False):
    if verbose:
        print("Lat: " + str(lat) + ", Long: " + str(long))
    s = ''
    if precision == 0:
        return s

    # Quadrants are numbered clockwise from the top left.
    if lat >= 0:
        if long >= 0:
            s = '2'
        else:
            s = '1'
    else:
        if long >= 0:
            s = '3'
        else:
            s = '4'

    # Rescale the coordinates for the small quadrant.
    # Translate to the top left quadrant.
    if s == '1':
        lat = 2 * lat - 90
        long = 2 * long + 180
    elif s == '2':
        lat = 2 * lat - 90
        long = 2 * long - 180
    elif s == '3':
        lat = 2 * lat + 90
        long = 2 * long - 180
    elif s == '4':
        lat = 2 * lat + 90
        long = 2 * long + 180
    
    return s + get_square(lat, long, precision - 1)

def get_lines(polygons):
    lines = []
    for polygon in polygons:
        for i in range(len(polygon) - 1):
            lines.append((polygon[i], polygon[i + 1]))
    return lines

# Return a dictionary mapping square coordinates to each line that intersects that square.
def chunk_lines(lines, precision):
    num_interpolations = []
    def interpolate(p1, p2):
        x1, y1 = p1
        x2, y2 = p2
        square_dim = 180 / (2 ** precision)
        dist = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        num_pts = max(4, int(4 * dist / square_dim))
        num_interpolations.append(num_pts)
        return [(x1 + i * (x2 - x1) / (num_pts - 1), y1 + i * (y2 - y1) / (num_pts - 1)) for i in range(num_pts + 1)]

    chunks = {}
    print("Chunking lines...")
    for line in tqdm(lines):
        interpolations = interpolate(line[0], line[1])
        for interpolation in interpolations:
            square = get_square(interpolation[0], interpolation[1], precision)
            if square not in chunks:
                chunks[square] = []
            chunks[square].append(line)

    # Remove duplicate lines.
    print("Removing duplicate lines...")
    for square in tqdm(chunks):
        chunks[square] = list(set(chunks[square]))

    print("Average interpolations:", sum(num_interpolations) / len(num_interpolations))
    return chunks

# Plot distribution of number of lines in each chunk.
def plot_chunk_distribution(chunks):
    plt.hist([len(chunk) for chunk in chunks.values()])
    plt.yscale('log')
    plt.ylabel('Number of lines')
    plt.xlabel('Number of chunks')
    plt.show()


def main():
    polygons = read_polygons()

    print("Total number of polygons: " + str(len(polygons)))
    print("Total number of points: " + str(sum([len(polygon) for polygon in polygons])))

    lines = get_lines(polygons)
    print("Number of lines:", len(lines))

    precision = 10
    chunks = chunk_lines(lines, precision)
    print("Number of chunks:", len(chunks))
    print("Number of lines in chunks:", sum([len(chunk) for chunk in chunks.values()]))
    print("Average number of lines in a chunk:", sum([len(chunk) for chunk in chunks.values()]) / len(chunks))
    plot_chunk_distribution(chunks)

    
def unit_test():
    assert(get_square(90, 180, 4) == '2222')
    assert(get_square(-30, 30, 2) == '31')

unit_test()
main()