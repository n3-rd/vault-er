import { db, type IndexedFile } from './db';
export type { IndexedFile } from './db';

type NullableString = string | null | undefined;

export interface IndexUploadInput {
  cid: string;
  name: string;
  spaceDid: string;
  spaceName?: NullableString;
  description?: NullableString;
  tags?: string[] | null;
  shards?: string[] | null;
  size?: number | null;
  mimeType?: NullableString;
}

export interface ListIndexedUploadsOptions {
  limit?: number;
  spaceDid?: string;
}

const uniq = (values: string[] | undefined | null): string[] | undefined => {
  if (!values || values.length === 0) return undefined;
  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (cleaned.length === 0) return undefined;
  return Array.from(new Set(cleaned));
};

const normalize = (value: NullableString): string =>
  (value ?? '').trim().toLowerCase();

const buildSearchText = (input: {
  cid: string;
  name: string;
  description?: string;
  tags?: string[];
  spaceDid: string;
  spaceName?: string;
  shards?: string[];
}): string => {
  const tokens = [
    input.cid,
    input.name,
    input.description ?? '',
    ...(input.tags ?? []),
    input.spaceDid,
    input.spaceName ?? '',
    ...(input.shards ?? []),
  ];
  return tokens
    .map((token) => normalize(token))
    .filter((token) => token.length > 0)
    .join(' ');
};

const limitResults = <T>(items: T[], limit?: number): T[] => {
  if (!limit || limit <= 0) return items;
  if (items.length <= limit) return items;
  return items.slice(0, limit);
};

export const indexUpload = async (params: IndexUploadInput): Promise<IndexedFile> => {
  const {
    cid,
    name,
    spaceDid,
    spaceName,
    description,
    tags,
    shards,
    size,
    mimeType,
  } = params;

  const existing = await db.files.get(cid);
  const createdAt = existing?.createdAt ?? new Date();
  const now = new Date();

  const cleanedTags = uniq(tags ?? existing?.tags);
  const cleanedShards = uniq(shards ?? existing?.shards);
  const trimmedDescription =
    description?.trim() ??
    (existing?.description ? existing.description.trim() : undefined);
  const resolvedSpaceName = spaceName?.toString().trim() || existing?.spaceName;

  const record: IndexedFile = {
    cid,
    name,
    description: trimmedDescription,
    tags: cleanedTags,
    createdAt,
    updatedAt: now,
    spaceDid,
    spaceName: resolvedSpaceName,
    shards: cleanedShards,
    size: size ?? existing?.size,
    mimeType: mimeType ?? existing?.mimeType,
    nameLower: name.toLowerCase(),
    searchText: buildSearchText({
      cid,
      name,
      description: trimmedDescription,
      tags: cleanedTags,
      spaceDid,
      spaceName: resolvedSpaceName,
      shards: cleanedShards,
    }),
  };

  await db.files.put(record);
  return record;
};

export const listIndexedUploads = async (
  options: ListIndexedUploadsOptions = {}
): Promise<IndexedFile[]> => {
  const { limit = 50, spaceDid } = options;
  let uploads = await db.files.orderBy('updatedAt').reverse().toArray();
  if (spaceDid) {
    uploads = uploads.filter((upload) => upload.spaceDid === spaceDid);
  }
  return limitResults(uploads, limit);
};

export const searchIndexedUploads = async (
  query: string,
  options: ListIndexedUploadsOptions = {}
): Promise<IndexedFile[]> => {
  const normalizedQuery = normalize(query);
  let uploads = await db.files.orderBy('updatedAt').reverse().toArray();

  if (options.spaceDid) {
    uploads = uploads.filter((upload) => upload.spaceDid === options.spaceDid);
  }

  if (!normalizedQuery) {
    return limitResults(uploads, options.limit ?? 50);
  }

  const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 0);
  if (terms.length === 0) {
    return limitResults(uploads, options.limit ?? 50);
  }

  const matches = uploads.filter((upload) =>
    terms.every((term) => upload.searchText.includes(term))
  );

  return limitResults(matches, options.limit ?? 50);
};

export const deleteIndexedUpload = async (cid: string): Promise<void> => {
  await db.files.delete(cid);
};

export const clearIndexedUploads = async (): Promise<void> => {
  await db.files.clear();
};
