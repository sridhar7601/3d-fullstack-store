import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Sky, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

// Reuse the Model component from UserPage
function Model({ modelData, onModelClick }) {
  const { scene } = useGLTF(modelData.gltfUrl);
  const groupRef = useRef();
  const { raycaster, camera, mouse } = useThree();

  useEffect(() => {
    console.log('Model loaded:', scene);
    scene.traverse((child) => {
      if (child.isMesh) {
        console.log('Found mesh:', child.name);
        child.userData.type = 'clickable';
      }
    });
  }, [scene]);

  useFrame(() => {
    if (groupRef.current) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(groupRef.current.children, true);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        if (clickedMesh.userData.type === 'clickable') {
          document.body.style.cursor = 'pointer';
        } else {
          document.body.style.cursor = 'default';
        }
      } else {
        document.body.style.cursor = 'default';
      }
    }
  });

  const handleClick = (event) => {
    event.stopPropagation();
    if (groupRef.current) {
      const intersects = raycaster.intersectObjects(groupRef.current.children, true);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        if (clickedMesh.userData.type === 'clickable') {
          console.log('Mesh clicked:', clickedMesh.name);
          onModelClick(clickedMesh.name || 'Unnamed part');
        }
      }
    }
  };

  return (
    <group ref={groupRef} onClick={handleClick}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingFallback() {
  const { viewport } = useThree();
  return (
    <Html center style={{
      width: viewport.width,
      height: viewport.height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      color: 'white',
    }}>
      <div>Loading...</div>
    </Html>
  );
}

function AdminPage() {
  const [files, setFiles] = useState({
    gltf: null,
    bin: null,
    textures: []
  });
  const [modelData, setModelData] = useState(null);

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (name === 'textures') {
      setFiles(prev => ({ ...prev, [name]: Array.from(selectedFiles) }));
    } else {
      setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('gltf', files.gltf);
    formData.append('bin', files.bin);
    files.textures.forEach(texture => formData.append('textures', texture));

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('Upload successful:', data);
      alert('Files uploaded successfully');
      
      // Set the modelData for preview
      setModelData({
        gltfUrl: `http://localhost:3000/uploads/${data.gltfFile}`,
        textureUrls: {
          baseColor: data.textureFiles.find(t => t.includes('baseColor')) ? `http://localhost:3000/uploads/textures/${data.textureFiles.find(t => t.includes('baseColor'))}` : null,
          normal: data.textureFiles.find(t => t.includes('normal')) ? `http://localhost:3000/uploads/textures/${data.textureFiles.find(t => t.includes('normal'))}` : null,
          metallicRoughness: data.textureFiles.find(t => t.includes('metallicRoughness')) ? `http://localhost:3000/uploads/textures/${data.textureFiles.find(t => t.includes('metallicRoughness'))}` : null,
        }
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    }
  };

  const handleModelClick = (partName) => {
    console.log(`Clicked on: ${partName}`);
  };

  return (
    <div>
      <h1>Admin Page</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="gltf">GLTF File:</label>
          <input type="file" id="gltf" name="gltf" onChange={handleFileChange} accept=".gltf" required />
        </div>
        <div>
          <label htmlFor="bin">BIN File:</label>
          <input type="file" id="bin" name="bin" onChange={handleFileChange} accept=".bin" required />
        </div>
        <div>
          <label htmlFor="textures">Texture Files:</label>
          <input type="file" id="textures" name="textures" onChange={handleFileChange} accept="image/*" multiple />
        </div>
        <button type="submit">Upload Files</button>
      </form>

      {modelData && (
        <div style={{ width: '100%', height: '500px', marginTop: '20px' }}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
            <Sky />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Suspense fallback={<LoadingFallback />}>
              <Model modelData={modelData} onModelClick={handleModelClick} scale={0.01} position={[0, -1, 0]} />
            </Suspense>
            <Environment preset="sunset" background />
          </Canvas>
        </div>
      )}
    </div>
  );
}

export default AdminPage;