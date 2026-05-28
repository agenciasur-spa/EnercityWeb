import sharp from 'sharp';
import { join } from 'path';

async function convertLogo() {
  try {
    // Rutas relativas a la raíz del proyecto (CWD)
    const svgPath = 'src/assets/Enercity_logo_FFF.svg';
    const pngPath = 'src/assets/logoEnercity.png';

    await sharp(svgPath)
      .resize(300, null, { fit: 'contain' })
      .png()
      .toFile(pngPath);

    console.log('✅ Logo blanco convertido y guardado en src/assets/logoEnercity.png');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

convertLogo();