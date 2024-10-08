import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Include the Model component here (same as in AdminPage)
function Model({ modelData, onModelClick, scale = 1, position = [0, 0, 0] }) {
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
      <group ref={groupRef} onClick={handleClick} scale={scale} position={position}>
        <primitive object={scene} />
      </group>
    );
  }
function UserPage() {
  const [shopModel, setShopModel] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShopModel();
    fetchProducts();
  }, []);

  const fetchShopModel = async () => {
    try {
      const response = await fetch('http://localhost:3000/shop-model');
      const data = await response.json();
      setShopModel({
        gltfUrl: `http://localhost:3000/uploads/shop/${data.gltfFile}`,
      });
    } catch (error) {
      console.error('Error fetching shop model:', error);
      setError(error.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/products');
      const data = await response.json();
      setProducts(data.map(p => ({
        ...p,
        gltfUrl: `http://localhost:3000/uploads/products/${p.name}/${p.gltfFile}`,
        position: p.position || [0, 0, 0]
      })));
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!shopModel) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <Sky />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Suspense fallback={null}>
          <Model modelData={shopModel} onModelClick={(part) => console.log('Clicked on shop part:', part)} scale={0.01} position={[0, -1, 0]} />
          {products.map((product, index) => (
            <Model 
              key={`${product.name}-${index}`}
              modelData={product}
              onModelClick={(part) => console.log(`Clicked on ${product.name} part:`, part)}
              scale={0.01}
              position={product.position}
            />
          ))}
        </Suspense>
        <Environment preset="sunset" background />
      </Canvas>
    </div>
  );
}

export default UserPage;