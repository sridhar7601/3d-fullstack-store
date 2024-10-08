const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(__dirname, 'uploads');
    if (file.fieldname === 'shop') {
      dir = path.join(dir, 'shop');
    } else if (file.fieldname.startsWith('product')) {
      dir = path.join(dir, 'products', req.body.productName);
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (file.fieldname.endsWith('Textures')) {
      dir = path.join(dir, 'textures');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/upload-shop', upload.fields([
  { name: 'shop', maxCount: 2 },
  { name: 'shopTextures', maxCount: 10 }
]), (req, res) => {
  const files = req.files;
  console.log('Uploaded shop files:', files);

  if (!files.shop || files.shop.length < 2) {
    return res.status(400).send('Both GLTF and BIN files are required for the shop');
  }

  const gltfFile = files.shop.find(f => f.originalname.endsWith('.gltf'));
  const binFile = files.shop.find(f => f.originalname.endsWith('.bin'));
  const textureFiles = files.shopTextures || [];

  res.json({
    message: 'Shop files uploaded successfully',
    gltfFile: gltfFile.filename,
    binFile: binFile.filename,
    textureFiles: textureFiles.map(file => file.filename)
  });
});

app.post('/upload-product', upload.fields([
  { name: 'product', maxCount: 2 },
  { name: 'productTextures', maxCount: 10 }
]), (req, res) => {
  const files = req.files;
  const productName = req.body.productName;
  console.log('Uploaded product files:', files);

  if (!files.product || files.product.length < 2) {
    return res.status(400).send('Both GLTF and BIN files are required for the product');
  }

  const gltfFile = files.product.find(f => f.originalname.endsWith('.gltf'));
  const binFile = files.product.find(f => f.originalname.endsWith('.bin'));
  const textureFiles = files.productTextures || [];

  // Save product info (in a real app, you'd use a database)
  const productInfo = {
    name: productName,
    gltfFile: gltfFile.filename,
    binFile: binFile.filename,
    textureFiles: textureFiles.map(file => file.filename),
    position: { x: 0, y: 0, z: 0 }
  };
  
  // In a real app, you'd save this to a database
  // For now, we'll just write it to a file
  const productsFile = path.join(__dirname, 'products.json');
  let products = [];
  if (fs.existsSync(productsFile)) {
    products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  }
  products.push(productInfo);
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

  res.json({
    message: 'Product files uploaded successfully',
    product: productInfo
  });
});

app.get('/shop-model', (req, res) => {
  const shopDir = path.join(__dirname, 'uploads', 'shop');
  const texturesDir = path.join(shopDir, 'textures');
  
  try {
    const files = fs.readdirSync(shopDir);
    const textureFiles = fs.existsSync(texturesDir) ? fs.readdirSync(texturesDir) : [];

    const modelInfo = {
      gltfFile: files.find(file => file.endsWith('.gltf')),
      binFile: files.find(file => file.endsWith('.bin')),
      textures: textureFiles
    };

    if (!modelInfo.gltfFile || !modelInfo.binFile) {
      return res.status(404).json({ error: 'Some shop model files are missing' });
    }

    res.json(modelInfo);
  } catch (error) {
    console.error('Error reading shop directory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/products', (req, res) => {
  const productsFile = path.join(__dirname, 'products.json');
  if (fs.existsSync(productsFile)) {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    res.json(products);
  } else {
    res.json([]);
  }
});

app.post('/save-layout', (req, res) => {
  const layout = req.body;
  const productsFile = path.join(__dirname, 'products.json');
  fs.writeFileSync(productsFile, JSON.stringify(layout, null, 2));
  res.json({ message: 'Layout saved successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
