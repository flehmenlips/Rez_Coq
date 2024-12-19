import * as Jimp from 'jimp';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateIcon() {
    try {
        console.log('Starting icon generation...');
        
        // Create a new image (1024x1024, green background)
        const image = await Jimp.create(1024, 1024, Jimp.rgbaToInt(76, 175, 80, 255));
        
        // Load font
        console.log('Loading font...');
        const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
        
        // Add text
        console.log('Adding text...');
        image.print(
            font,
            0,
            384,
            {
                text: 'RC',
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            },
            1024
        );
        
        // Save as PNG
        console.log('Saving image...');
        await image.writeAsync('build/icon.png');
        console.log('Icon generated successfully!');
    } catch (error) {
        console.error('Error:', error);
    }
}

generateIcon(); 