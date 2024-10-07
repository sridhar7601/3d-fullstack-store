import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Sky, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

function Model({ modelData, onModelClick, selectedMesh }) {
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
        const hoveredMesh = intersects[0].object;
        if (hoveredMesh.userData.type === 'clickable') {
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

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (child.name === selectedMesh) {
          child.material.emissive = new THREE.Color(0x00ff00);
        } else {
          child.material.emissive = new THREE.Color(0x000000);
        }
      }
    });
  }, [scene, selectedMesh]);

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
  const [selectedMesh, setSelectedMesh] = useState(null);
  const [config, setConfig] = useState({});

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
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
        return;
      }
      const data = await response.json();
      console.log('Upload successful:', data);
      alert('Files uploaded successfully');
      
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

  const handleModelClick = (meshName) => {
    setSelectedMesh(meshName);
  };

  const handleConfigChange = (action, value) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      [selectedMesh]: {
        ...prevConfig[selectedMesh],
        [action]: value
      }
    }));
  };

  const saveConfig = async () => {
    console.log("Config data being sent:", config); // Log the data before sending it

    // Validate that config is not empty
    if (Object.keys(config).length === 0) {
      alert('No configuration to save. Please select a mesh and set actions.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config), // Use 'config' instead of 'configData'
      });
      const data = await response.json();
      console.log('Response data:', data);
      if (!response.ok) {
        throw new Error(data.error || 'Error saving configuration');
      }
      alert('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(`Failed to save configuration: ${error.message}`);
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '300px', padding: '20px', overflowY: 'auto', height: '100vh' }}>
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

        <h2>Configuration Panel</h2>
        {selectedMesh ? (
          <>
            <h3>{selectedMesh}</h3>
            <div>
              <label>
                Hover Action:
                <input
                  type="text"
                  value={config[selectedMesh]?.hover || ''}
                  onChange={(e) => handleConfigChange('hover', e.target.value)}
                  placeholder="Enter hover action"
                />
              </label>
            </div>
            <div>
              <label>
                Click Action:
                <input
                  type="text"
                  value={config[selectedMesh]?.click || ''}
                  onChange={(e) => handleConfigChange('click', e.target.value)}
                  placeholder="Enter click action"
                />
              </label>
            </div>
            <button onClick={saveConfig} style={{ marginTop: '10px' }}>Save Configuration</button>
          </>
        ) : (
          <p>Select a mesh from the model to configure actions.</p>
        )}
      </div>
      <div style={{ flex: 1, height: '100vh' }}>
        {modelData ? (
          <Canvas style={{ width: '100%', height: '100%' }}>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            <Sky />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Suspense fallback={<LoadingFallback />}>
              <Model 
                modelData={modelData} 
                onModelClick={handleModelClick}
                selectedMesh={selectedMesh}
                scale={0.01} 
                position={[0, -1, 0]} 
              />
            </Suspense>
            <Environment preset="sunset" background />
          </Canvas>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p>No model uploaded. Please upload model files to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
