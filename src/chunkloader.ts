import { Chunk, Chunks, RawLine } from "./types";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, query, get, DatabaseReference, child, QueryConstraint, Database, startAt, orderByKey, endBefore } from "firebase/database";
import { Point, ViewPort } from "./viewport";

export class Chunkloader {
    public cache: Chunks = {};
    private dbRef: DatabaseReference;
    private db: Database;
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

    public getChunksInView(viewport: ViewPort): Chunk[] {
        const target = viewport.scale(this.padding);
        const chunks: Chunk[] = [];
        const resolution = 'c';

        function addChunksInBox(box: ViewPort, chunk: Chunk) {
            if (!box.intersects(target)) {
                return;
            }

            if (box.intersectionArea(target) / box.area() > 0.5) {
                chunks.push(chunk);
            } else {
                const subBoxes = box.getQuadrants();
                for (let i = 0; i < subBoxes.length; i++) {
                    addChunksInBox(subBoxes[i], chunk + i);
                }
            }
        }

        const rootViewPort = new ViewPort(new Point(-180, -90), new Point(180, 90));
        addChunksInBox(rootViewPort, resolution);
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
        if (Object.keys(this.cache).includes(chunk)) {
            return true;
        }
        if (chunk.length === 1) {
            return false;
        }
        return this.chunkLoaded(chunk.slice(0, -1));
    }

    // Loads a single chunk into cache, returns null if chunk does not exist and is not in cache
    public async loadChunk(chunk: Chunk) {
        if (this.chunkLoaded(chunk)) {
            return;
        }
        console.log(`Loading chunk ${chunk}`);
        const snapshot = await get(query(this.dbRef, orderByKey(), startAt(chunk), endBefore(this.nextChunk(chunk))));
        console.log(snapshot.val());
        if (!snapshot.exists()) {
            this.cache[chunk] = [];
            // Query parent chunk
            return this.loadChunk(chunk.slice(0, -1));
        }
        
        Object.assign(this.cache, snapshot.val());
        if (!this.cache[chunk]) {
            this.cache[chunk] = [];
        }
        return this.cache[chunk];
    }
}