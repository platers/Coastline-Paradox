import { Chunk, Chunks, RawLine } from "./types";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, query, get, DatabaseReference, child, QueryConstraint, Database, startAt, orderByKey, endBefore, limitToLast } from "firebase/database";
import { Point, ViewPort } from "./viewport";

const rootViewPort = new ViewPort(new Point(-180, -90), new Point(180, 90));
export class Chunkloader {
    public cache: Chunks = {};
    private dbRef: DatabaseReference;
    private padding = 1.4;

    constructor() {
        // TODO: Add SDKs for Firebase products that you want to use
        // https://firebase.google.com/docs/web/setup#available-libraries

        // Your web app's Firebase configuration
        // For Firebase JS SDK v7.20.0 and later, measurementId is optional
        const firebaseConfig = {
        apiKey: "AIzaSyAs4rLWFbJymfRmC1BdItylcSDwDwI0Meo",
        authDomain: "coastline-d884f.firebaseapp.com",
        projectId: "coastline-d884f",
        storageBucket: "coastline-d884f.appspot.com",
        messagingSenderId: "176713969683",
        appId: "1:176713969683:web:08c70e38da50adef9bcfe6",
        measurementId: "G-J7KFTBJ2L1"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);

        const db = getDatabase(app);
        this.dbRef = ref(db);
    }

    public getResolution(viewport: ViewPort) {
        const width = viewport.width;
        const maxWidth = 360;
        const ratio = width / maxWidth;
        const p = 0.3;
        const resolutions = ['c', 'l'];
        for (let i = 0; i < resolutions.length; i++) {
            if (ratio > p ** (i + 1)) {
                return resolutions[i];
            }
        }
        return 'l';
    }

    public getChunksInView(viewport: ViewPort): Chunk[] {
        const target = viewport.scale(this.padding);
        const chunks: Chunk[] = [];
        const resolution = this.getResolution(viewport);

        function addChunksInBox(box: ViewPort, chunk: Chunk) {
            if (!box.intersects(target)) {
                return;
            }
            if (box.normalizedIntersectionArea(target) / box.area() > 0.5) {
                chunks.push(chunk);
            } else {
                const subBoxes = box.getQuadrants();
                for (let i = 0; i < subBoxes.length; i++) {
                    addChunksInBox(subBoxes[i], chunk + (i + 1));
                }
            }
        }

        addChunksInBox(rootViewPort, resolution);
        return chunks;
    }

    private getChunksinViewFromCache(target: ViewPort) {
        const chunks: Chunk[] = [];
        const resolution = this.getResolution(target);

        function addChunksInBox(box: ViewPort, chunk: Chunk, cache: Chunks) {
            if (!box.intersects(target) || cache[chunk] === undefined) {
                return;
            }
            if (cache[chunk].length > 0) {
                chunks.push(chunk);
                return;
            }

            const subBoxes = box.getQuadrants();
            for (let i = 0; i < subBoxes.length; i++) {
                addChunksInBox(subBoxes[i], chunk + (i + 1), cache);
            }
        }

        addChunksInBox(rootViewPort, resolution, this.cache);
        return chunks;
    }

    // Loads all chunks in view into cache
    public async loadChunks(viewport: ViewPort) {
        let chunks = this.getChunksInView(viewport);
        const promises = chunks.map(chunk => this.loadChunk(chunk));
        await Promise.all(promises);
    }

    // Gets the next chunk not inside the current chunk
    private nextChunk(chunk: Chunk) {
        return chunk.substring(0, chunk.length - 1) + String.fromCharCode(chunk.charCodeAt(chunk.length - 1) + 1);
    }

    // Checks if a chunk or an ancestor is loaded into cache
    private chunkLoaded(chunk: Chunk) {
        if (this.cache[chunk] !== undefined) {
            return true;
        }
        for (let i = 1; i < chunk.length - 1; i++) {
            const ancestor = this.cache[chunk.slice(0, i)];
            if (ancestor !== undefined && ancestor.length > 0) {
                return true;
            }
        }
        return false;
    }

    // Loads a single chunk into cache, returns null if chunk does not exist and is not in cache
    public async loadChunk(chunk: Chunk) {
        if (this.chunkLoaded(chunk)) {
            return;
        }
        console.log(`Loading chunk ${chunk}`);
        this.cache[chunk] = [];
        const snapshot = await get(query(this.dbRef, orderByKey(), startAt(chunk), endBefore(this.nextChunk(chunk))));
        //console.log(snapshot.val());
        if (!snapshot.exists()) {
            this.cache[chunk] = [[[0, 0], [0, 0]]]; // Temp value to show that the chunk is being loaded
            // Query parent chunk
            const parentSnapshot = await get(query(this.dbRef, orderByKey(), startAt(chunk[0]), endBefore(chunk), limitToLast(1)));
            if (!parentSnapshot.exists()) {
                console.log(`Could not find parent. (should not happen)`);
                return;
            }

            return addSnapshotToCache(parentSnapshot, this.cache);
        }
        
        return addSnapshotToCache(snapshot, this.cache);

        function addSnapshotToCache(parentSnapshot, cache: Chunks) {
            const json = parentSnapshot.val();
            // Mark all ancestors as loaded by setting them to an empty array
            for (let chunk of Object.keys(json)) {
                for (let i = 1; i < chunk.length; i++) {
                    json[chunk.slice(0, i)] = [];
                }
            }
            Object.assign(cache, json);
            return cache[chunk];
        }
    }

    public getLines(viewport: ViewPort) {
        let lines: RawLine[] = [];
        const chunks = this.getChunksinViewFromCache(viewport);
        // console.log(chunks, this.cache);
        // flatten the lines into a single array
        for (const chunk of chunks) {
            lines = lines.concat(this.cache[chunk]);
        }
        lines = lines.map(line => {
            const [p1, p2] = line;
            const vp1 = viewport.p1;
            // wrap line to be right and under the top left corner
            while (p1[0] < vp1.x && p2[0] < vp1.x) {
            p1[0] += 360;
            p2[0] += 360;
            }
            while (p1[1] < vp1.y && p2[1] < vp1.y) {
            p1[1] += 180;
            p2[1] += 180;
            }
            while (p1[0] - 360 > vp1.x && p2[0] - 360 > vp1.x) {
            p1[0] -= 360;
            p2[0] -= 360;
            }
            while (p1[1] - 180 > vp1.y && p2[1] - 180 > vp1.y) {
            p1[1] -= 180;
            p2[1] -= 180;
            }
            return [p1, p2];
        });
        return lines;
    }

    // Returns the number of lines in the cache
    public cacheSize() {
        let size = 0;
        for (const [chunk, lines] of Object.entries(this.cache)) {
            size += lines.length;
        }
        return size; 
    }
}