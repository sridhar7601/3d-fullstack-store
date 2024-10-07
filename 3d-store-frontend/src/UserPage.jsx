import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useFrame, Canvas, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Sky, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

function Model({ modelData, config }) {
  const { scene } = useGLTF(modelData.gltfUrl);
  const groupRef = useRef();
  const { raycaster, camera, mouse } = useThree();
  const [hoveredMesh, setHoveredMesh] = useState(null);

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
        const intersectedMesh = intersects[0].object;
        if (config[intersectedMesh.name]?.hover) {
          setHoveredMesh(intersectedMesh.name);
          document.body.style.cursor = 'pointer';
        } else {
          setHoveredMesh(null);
          document.body.style.cursor = 'default';
        }
      } else {
        setHoveredMesh(null);
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
        if (config[clickedMesh.name]?.click) {
          alert(`Clicked on ${clickedMesh.name}: ${config[clickedMesh.name].click}`);
        }
      }
    }
  };

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (child.name === hoveredMesh) {
          child.material.emissive = new THREE.Color(0x00ff00);
        } else {
          child.material.emissive = new THREE.Color(0x000000);
        }
      }
    });
  }, [scene, hoveredMesh]);

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

function UserPage() {
  const [modelData, setModelData] = useState(null);
  const [config, setConfig] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch('http://localhost:3000/model-info');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received model info:', data);
        
        setModelData({
          gltfUrl: `http://localhost:3000/uploads/${data.gltfFile}`,
          textureUrls: {
            baseColor: data.textures.find(t => t.includes('baseColor')) ? `http://localhost:3000/uploads/textures/${data.textures.find(t => t.includes('baseColor'))}` : null,
            normal: data.textures.find(t => t.includes('normal')) ? `http://localhost:3000/uploads/textures/${data.textures.find(t => t.includes('normal'))}` : null,
            metallicRoughness: data.textures.find(t => t.includes('metallicRoughness')) ? `http://localhost:3000/uploads/textures/${data.textures.find(t => t.includes('metallicRoughness'))}` : null,
          }
        });

        // Fetch configuration
        const configResponse = await fetch('http://localhost:3000/get-config');
        if (!configResponse.ok) {
          throw new Error(`HTTP error! status: ${configResponse.status}`);
        }
        const configData = await configResponse.json();
        setConfig(configData);
      } catch (error) {
        console.error('Error in fetchModelInfo:', error);
        setError(error.message);
      }
    };

    fetchModelInfo();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!modelData) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
          <Model 
            modelData={modelData} 
            config={config}
            scale={0.01} 
            position={[0, -1, 0]} 
          />
        </Suspense>
        <Environment preset="sunset" background />
      </Canvas>
    </div>
  );
}

export default UserPage;