import Dexie, { type EntityTable } from 'dexie';

export interface IndexedFile {
    cid: string;
    name: string;
    description?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
    spaceDid: string;
    spaceName?: string;
    shards?: string[];
    size?: number;
    mimeType?: string;
    nameLower: string;
    searchText: string;
}

export interface FileTable extends EntityTable<IndexedFile, 'cid'> {}

class VaultIndexDB extends Dexie {
    files!: FileTable;

    constructor() {
        super('storacha_index');

        this.version(3).stores({
            files: '&cid, spaceDid, nameLower, searchText, createdAt, updatedAt, *tags, *shards'
        });

        this.files = this.table('files');
    }
}

export const db = new VaultIndexDB();
