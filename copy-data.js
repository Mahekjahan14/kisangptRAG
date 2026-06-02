import fs from 'fs';
import path from 'path';

try {
  console.log('Copying data folder to root for Vercel deployment...');
  fs.cpSync('kisangpt-rag/data', 'data', { recursive: true });
  console.log('Data folder successfully copied to root!');
} catch (err) {
  console.error('Error copying data folder:', err);
  process.exit(1);
}
