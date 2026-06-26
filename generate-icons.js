#!/usr/bin/env node

/**
 * Icon Generation Script
 * Converts SVG icons to PNG format
 * 
 * Usage: node generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateIcons() {
  try {
    const sharp = (await import('sharp')).default;
    
    const publicDir = path.join(__dirname, 'public');
    
    // Icon configurations
    const icons = [
      { svgFile: 'icon-192x192.svg', pngFile: 'icon-192x192.png', size: 192 },
      { svgFile: 'icon-512x512.svg', pngFile: 'icon-512x512.png', size: 512 },
      { svgFile: 'apple-touch-icon.svg', pngFile: 'apple-touch-icon.png', size: 180 },
    ];
    
    console.log('🎨 Converting SVG icons to PNG...\n');
    
    for (const { svgFile, pngFile, size } of icons) {
      const svgPath = path.join(publicDir, svgFile);
      const pngPath = path.join(publicDir, pngFile);
      
      if (fs.existsSync(svgPath)) {
        try {
          await sharp(svgPath)
            .resize(size, size, { fit: 'cover' })
            .png({ quality: 90 })
            .toFile(pngPath);
          console.log(`✅ Generated ${pngFile} (${size}x${size})`);
        } catch (err) {
          console.error(`❌ Error generating ${pngFile}:`, err.message);
        }
      } else {
        console.warn(`⚠️  ${svgFile} not found at ${svgPath}`);
      }
    }
    
    console.log('\n✨ Icon generation complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateIcons().catch(console.error);
