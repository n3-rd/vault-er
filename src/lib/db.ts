import Dexie, { type EntityTable } from 'dexie';

interface File {
    cid: string
    name: string
    description?: string
    tags?: string[],
    createdAt: Date,
    spaceDid: string,
    shards?: string[],
}

interface FileTable extends EntityTable<File, 'cid'> {}

const db = new Dexie('storacha_index');

db.version(2).stores({
    files: 'cid, name, description, tags, createdAt, spaceDid, shards'
})

export type { File, FileTable };
export {db};