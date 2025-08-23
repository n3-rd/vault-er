import { db, type File } from "./db";

export const indexUpload = async (cid: string, name: string, spaceDid: string, description?: string, tags?: string[]) => {
    // Create a new array to ensure it's a plain array, not a Proxy
    const safeTagsArray = tags ? [...tags] : undefined;
    
    const file = await db.files.add({ 
        cid: cid, 
        name: name, 
        description: description, 
        tags: safeTagsArray, 
        createdAt: new Date(), 
        spaceDid: spaceDid 
    }) as File;
    return file;
}
