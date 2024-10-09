const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const modelName = req.body.modelName;
    if (!modelName) {
      return cb(new Error('Model name is required'), null);
    }
    
    const dir = path.join(__dirname, 'uploads', modelName);

    // Create a directory for each model if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (file.fieldname === 'textures') {
      const textureDir = path.join(dir, 'textures');
      if (!fs.existsSync(textureDir)) {
        fs.mkdirSync(textureDir);
      }
      cb(null, textureDir);
    } else {
      cb(null, dir);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// In your upload endpoint
app.post('/upload', upload.fields([
  { name: 'gltf', maxCount: 1 },
  { name: 'bin', maxCount: 1 },
  { name: 'textures', maxCount: 100 }
]), (req, res) => {
  console.log('Request Body:', req.body);
  const files = req.files;
  const modelName = req.body.modelName;
  const position = JSON.parse(req.body.position || '{"x":0,"y":0,"z":0}');
  const scale = JSON.parse(req.body.scale || '{"x":1,"y":1,"z":1}');
  const tableNumber = parseInt(req.body.tableNumber) || 1;
  // const type = req.body.type || 'other'; // Add this line

  if (!files.gltf || !files.bin) {
    return res.status(400).send('Both GLTF and BIN files are required');
  }

  // Save model information including position, scale, table number, and type
  const modelInfo = {
    name: modelName,
    gltf: files.gltf[0].filename,
    bin: files.bin[0].filename,
    textures: (files.textures || []).map(file => file.filename),
    position,
    scale,
    tableNumber,
    // type // Include type in modelInfo
  };

  const modelInfoPath = path.join(__dirname, 'uploads', modelName, 'info.json');
  fs.writeFileSync(modelInfoPath, JSON.stringify(modelInfo, null, 2));

  res.json({
    message: `Files for model ${modelName} uploaded successfully`,
    modelInfo
  });
});
// Get all products endpoint
app.get('/products', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  try {
    const products = fs.readdirSync(uploadsDir)
      .filter(file => fs.statSync(path.join(uploadsDir, file)).isDirectory())
      .map(modelName => {
        const modelDir = path.join(uploadsDir, modelName);
        const infoPath = path.join(modelDir, 'info.json');
        if (fs.existsSync(infoPath)) {
          return JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        }
        return null;
      })
      .filter(product => product !== null);

    res.json(products);
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});