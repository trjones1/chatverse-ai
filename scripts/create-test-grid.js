#!/usr/bin/env node

// Create a test 2x2 grid from existing character images
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createTestGrid() {
  console.log('🎨 Creating test 2x2 grid...');
  
  const referencesDir = path.join(__dirname, '../public/references');
  
  // Find 4 different character images
  const images = [
    path.join(referencesDir, 'nyx/nyx-01.png'),
    path.join(referencesDir, 'lexi/lexi-01.png'),
    path.join(referencesDir, 'aiko/aiko-01.png'),
    path.join(referencesDir, 'chase/chase-01.png')
  ];
  
  // Check if all images exist
  for (const imagePath of images) {
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image not found: ${imagePath}`);
      return;
    }
  }
  
  console.log('📋 Found images:', images.map(p => path.basename(p)));
  
  try {
    // Resize all images to same size first
    const targetSize = 512; // 512x512 for each quadrant
    const resizedBuffers = [];
    
    for (const imagePath of images) {
      const resized = await sharp(imagePath)
        .resize(targetSize, targetSize, { 
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();
      resizedBuffers.push(resized);
      console.log(`✅ Resized ${path.basename(imagePath)} to ${targetSize}x${targetSize}`);
    }
    
    // Create 2x2 grid (1024x1024 total)
    const grid = await sharp({
      create: {
        width: targetSize * 2,
        height: targetSize * 2,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      { input: resizedBuffers[0], left: 0, top: 0 }, // top-left
      { input: resizedBuffers[1], left: targetSize, top: 0 }, // top-right
      { input: resizedBuffers[2], left: 0, top: targetSize }, // bottom-left
      { input: resizedBuffers[3], left: targetSize, top: targetSize }, // bottom-right
    ])
    .png()
    .toBuffer();
    
    // Save test grid
    const outputPath = path.join(__dirname, '../test-grid-2x2.png');
    await fs.promises.writeFile(outputPath, grid);
    
    console.log(`✅ Created test grid: ${outputPath}`);
    console.log(`📐 Grid size: ${targetSize * 2}x${targetSize * 2}`);
    console.log('🎯 Ready to test grid slicer in admin panel!');
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Error creating test grid:', error);
    throw error;
  }
}

createTestGrid().catch(console.error);