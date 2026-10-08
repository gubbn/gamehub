import Dexie, { type EntityTable } from "dexie";
import { newEliLibrary, type EliLibrary } from "./eli-data";

// Deliberately separate from gamehub-v1: personal pictures never enter cloud snapshots.
export const eliDb = new Dexie("gamehub-eli-v1") as Dexie & {
  library: EntityTable<EliLibrary, "key">;
};
eliDb.version(1).stores({ library: "key" });
export async function initializeEli() {
  await eliDb.transaction("rw", eliDb.library, async () => {
    if (!(await eliDb.library.get("main")))
      await eliDb.library.put(newEliLibrary());
  });
}
export async function updateEli(mutate: (library: EliLibrary) => void) {
  await eliDb.transaction("rw", eliDb.library, async () => {
    const library = await eliDb.library.get("main");
    if (!library) throw new Error("The picture library is still opening.");
    mutate(library);
    await eliDb.library.put(library);
  });
}
export async function preparePicture(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG or WebP image. Convert HEIC photos to JPG first.",
    );
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Choose a picture smaller than 8 MB.");
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare pictures.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.82);
    if (data.length > 500000)
      throw new Error(
        "This picture is too large. Try a simpler or smaller image.",
      );
    return data;
  } finally {
    image.close();
  }
}
