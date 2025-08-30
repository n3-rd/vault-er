// indexer.ts
import { db, type File } from "./db";

export const indexUpload = async (
  cid: string,
  name: string,
  spaceDid: string,
  description?: string,
  tags?: string[],
  shards?: string[]
): Promise<File> => {
  const safeTags = tags ? [...tags] : undefined;
  const file = await db.files.add({
    cid,
    name,
    description,
    tags: safeTags,
    createdAt: new Date(),
    spaceDid,
    shards,
  }) as File;
  return file;
};
