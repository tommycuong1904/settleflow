import { promises as fs } from 'fs';
import path from 'path';

/**
 * Ensure the feedback directory exists.
 */
async function ensureDir() {
  const dir = path.resolve(process.cwd(), 'feedback');
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, 'images'), { recursive: true });
}

/**
 * Save an attached image (data URL) to the feedback/images folder.
 * Returns the relative path to the saved file, or null if no image.
 */
async function saveImage(dataUrl: string | null): Promise<string | null> {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!matches) return null;
  const mime = matches[1]; // e.g., image/png
  const base64 = matches[2];
  const ext = mime.split('/')[1];
  const fileName = `${Date.now()}.${ext}`;
  const filePath = path.join(process.cwd(), 'feedback', 'images', fileName);
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
  // Return relative path for storage in JSON
  return `images/${fileName}`;
}

/**
 * Append a feedback entry to feedback/feedback.json.
 */
export async function appendFeedback(entry: {
  timestamp: string;
  category: string;
  rating: number;
  message: string;
  userEmail: string;
  userAddress: string;
  role: string;
  attachedImagePath?: string | null;
}) {
  await ensureDir();
  const jsonPath = path.resolve(process.cwd(), 'feedback', 'feedback.json');
  let data: any[] = [];
  try {
    const raw = await fs.readFile(jsonPath, 'utf-8');
    data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [];
  } catch (e) {
    // file may not exist or be invalid – start fresh
    data = [];
  }
  const imagePath = await saveImage(entry.attachedImagePath as any);
  const newEntry = { ...entry, attachedImagePath: imagePath };
  data.push(newEntry);
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}
