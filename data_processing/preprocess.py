# This script preprocesses shapefiles into a texture map.

import os
import shapefile
from tqdm import tqdm
import matplotlib.pyplot as plt
from multiprocessing import Pool
import time
import numpy as np
import json

def read_polygons(data_dir):
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
            # Iterate through all shapes in the shapefile.
            for i in range(len(shapes)):
                # Get the shape's geometry. Flip the x-coordinates
                points = list(map(lambda point: (-point[0], point[1]), shapes[i].points))
                polygons.append(points)

    return polygons


# Convert latitude and longitude to square coordinates.
def get_square(lat, long, precision, verbose=False):
    s = ''
    if precision == 0:
        return s

    for _ in range(precision):
        if verbose:
            print("Lat: " + str(lat) + ", Long: " + str(long))
        # Quadrants are numbered clockwise from the top left.
        if lat >= 0:
            if long >= 0:
                s += '1'
                lat = 2 * lat - 90
                long = 2 * long - 180
            else:
                s += '4'
                lat = 2 * lat - 90
                long = 2 * long + 180
        else:
            if long >= 0:
                s += '2'
                lat = 2 * lat + 90
                long = 2 * long - 180
            else:
                s += '3'
                lat = 2 * lat + 90
                long = 2 * long + 180
    
    return s

def get_lines(polygons):
    lines = []
    for polygon in polygons:
        for i in range(len(polygon) - 1):
            lines.append((polygon[i], polygon[i + 1]))
    return lines

def interpolate(p1, p2, precision):
    x1, y1 = p1
    x2, y2 = p2
    square_dim = 180 / (2 ** precision)
    dist = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    num_pts = max(4, int(4 * dist / square_dim))
    return [(x1 + i * (x2 - x1) / (num_pts - 1), y1 + i * (y2 - y1) / (num_pts - 1)) for i in range(num_pts + 1)]

def process_chunks(lines, box, square, max_size, chunks, bar):
    def line_intersects_box(line, box): # box is a tuple of ((x1, y1), (x2, y2)) top left and bottom right corners
        def line_segment_intersect(line1, line2):
            x1, y1 = line1[0]
            x2, y2 = line1[1]
            x3, y3 = line2[0]
            x4, y4 = line2[1]
            denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
            if denom == 0:
                return False
            ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
            ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom
            return ua >= 0 and ua <= 1 and ub >= 0 and ub <= 1
        
        def line_inside_box(line, box): 
            x1, y1 = line[0]
            x2, y2 = line[1]
            return min(x1, x2) >= box[0][0] and min(y1, y2) >= box[0][1] and max(x1, x2) <= box[1][0] and max(y1, y2) <= box[1][1]
        
        corners = [(box[0][0], box[0][1]), (box[0][0], box[1][1]), (box[1][0], box[1][1]), (box[1][0], box[0][1])]
        sides = [(corners[0], corners[1]), (corners[1], corners[2]), (corners[2], corners[3]), (corners[3], corners[0])]
        return any(line_segment_intersect(line, side) for side in sides) or line_inside_box(line, box)
    
    if len(lines) <= max_size:
        if len(lines) > 0:
            chunks[square] = lines
        bar.update(4 ** -len(square))
        return
    
    # Determine which quadrants the line intersects.
    top_left, bottom_right = box
    x1, y1 = top_left
    x2, y2 = bottom_right
    x_mid = (x1 + x2) / 2
    y_mid = (y1 + y2) / 2
    quadrant_boxes = [
        ((x1, y1), (x_mid, y_mid)),
        ((x_mid, y1), (x2, y_mid)),
        ((x_mid, y_mid), (x2, y2)),
        ((x1, y_mid), (x_mid, y2))
    ]
    quadrants = [[] for _ in range(4)]
    for line in lines:
        for i in range(4):
            if line_intersects_box(line, quadrant_boxes[i]):
                quadrants[i].append(line)
    
    # Recursively process the quadrants.
    for i in range(4):
        process_chunks(quadrants[i], quadrant_boxes[i], square + str(i + 1), max_size, chunks, bar)

# Return a dictionary mapping square coordinates to each line that intersects that square.
def chunk_lines(lines, max_size):
    print("Chunking lines...")
    bar = tqdm(total=1)
    chunks = {}
    process_chunks(lines, ((-180, -90), (180, 90)), '', max_size, chunks, bar)
    return chunks

# Plot distribution of number of lines in each chunk.
def plot_chunk_distribution(chunks):
    plt.hist([len(chunk) for chunk in chunks.values()])
    plt.xlabel('Number of lines')
    plt.ylabel('Number of chunks')
    plt.show()
    plt.clf()

    return
    # plot heatmap of chunks
    def get_chunk_coords(chunk):
        lvl = len(chunk)
        if lvl == 0:
            return (0, 0)
        
        lvl -= 1
        if chunk[0] == '1':
            x, y = 0, 0
        elif chunk[0] == '2':
            x, y = 2 ** lvl, 0
        elif chunk[0] == '3':
            x, y = 2 ** lvl, 2 ** lvl
        elif chunk[0] == '4':
            x, y = 0, 2 ** lvl
        
        cc = get_chunk_coords(chunk[1:])
        return (x + cc[0], y + cc[1])

    precision = len(list(chunks.keys())[0])
    arr = np.zeros((2 ** precision, 2 ** precision))
    for chunk, lines in chunks.items():
        x, y = get_chunk_coords(chunk)
        arr[y, x] = np.log(len(lines))
    plt.imshow(arr, cmap='hot', interpolation='nearest')
    plt.colorbar()
    plt.show()



if __name__ == '__main__':    
    polygons = read_polygons(data_dir='data_processing/gshhg-shp-2.3.7/GSHHS_shp/f/') # change f to i for faster testing

    print("Total number of polygons: " + str(len(polygons)))
    print("Total number of points: " + str(sum([len(polygon) for polygon in polygons])))

    lines = get_lines(polygons)
    print("Number of lines:", len(lines))

    max_size = 500
    chunks = chunk_lines(lines, max_size)
    print("Number of chunks:", len(chunks))
    print("Number of lines in chunks:", sum([len(chunk) for chunk in chunks.values()]))
    print("Average number of lines in a chunk:", sum([len(chunk) for chunk in chunks.values()]) / len(chunks))
    print("Maximum chunk depth:" + str(max([len(chunk) for chunk in chunks.keys()])))

    # save chunks to file
    with open('chunks.json', 'w') as f:
        json.dump(chunks, f)

    plot_chunk_distribution(chunks)

    