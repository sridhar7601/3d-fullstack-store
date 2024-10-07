const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
// const express = require('express');


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
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

app.post('/upload', upload.fields([
  { name: 'gltf', maxCount: 1 },
  { name: 'bin', maxCount: 1 },
  { name: 'textures', maxCount: 20 }
]), (req, res) => {
  const files = req.files;
  console.log('Uploaded files:', files);

  if (!files.gltf || !files.bin) {
    return res.status(400).send('Both GLTF and BIN files are required');
  }

  const gltfFile = files.gltf[0];
  const binFile = files.bin[0];
  const textureFiles = files.textures || [];

  res.json({
    message: 'Files uploaded successfully',
    gltfFile: gltfFile.filename,
    binFile: binFile.filename,
    textureFiles: textureFiles.map(file => file.filename)
  });
});

app.get('/model-info', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const texturesDir = path.join(uploadsDir, 'textures');
  
  try {
    const files = fs.readdirSync(uploadsDir);
    const textureFiles = fs.existsSync(texturesDir) ? fs.readdirSync(texturesDir) : [];

    const modelInfo = {
      gltfFile: files.find(file => file.endsWith('.gltf')),
      binFile: files.find(file => file.endsWith('.bin')),
      textures: textureFiles
    };

    if (!modelInfo.gltfFile || !modelInfo.binFile) {
      return res.status(404).json({ error: 'Some model files are missing' });
    }

    res.json(modelInfo);
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/save-config', (req, res) => {
  const config = req.body;
console.log( config,"config")
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Configuration data must be an object' });
  }

  // If valid, save it to the file system
  try {
    fs.writeFileSync(path.join(__dirname, 'meshConfig.json'), JSON.stringify(config, null, 2));
    res.json({ message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ error: 'Failed to save configuration: ' + error.message });
  }
});


// New endpoint to get mesh configurations
app.get('/get-config', (req, res) => {
  const configPath = path.join(__dirname, 'meshConfig.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json(config);
    } else {
      res.json({}); // Return an empty object if the file doesn't exist
    }
  } catch (error) {
    console.error('Error reading configuration:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});