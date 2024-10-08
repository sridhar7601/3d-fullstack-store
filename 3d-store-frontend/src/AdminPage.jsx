import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Sky, Environment, Html, TransformControls } from '@react-three/drei';
import * as THREE from 'three';

function Model({ modelData, onModelClick, scale = 1, position = [0, 0, 0] }) {
  const [error, setError] = useState(null);
  const { scene } = useGLTF(modelData.gltfUrl, undefined, (error) => {
    console.error('Error loading model:', error);
    setError(error);
  });
  
  const groupRef = useRef();
  const { raycaster, camera, mouse } = useThree();

  useEffect(() => {
    if (scene) {
      console.log('Model loaded:', scene);
      scene.traverse((child) => {
        if (child.isMesh) {
          console.log('Found mesh:', child.name);
          child.userData.type = 'clickable';
        }
      });
    }
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

  if (error) {
    return <Html>Error loading model: {error.message}</Html>;
  }

  return (
    <group ref={groupRef} onClick={handleClick} scale={scale} position={position}>
      {scene && <primitive object={scene} />}
    </group>
  );
}

function AdminPage() {
  const [shopModel, setShopModel] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShopModel();
    fetchProducts();
  }, []);

  const fetchShopModel = async () => {
    try {
      const response = await fetch('http://localhost:3000/shop-model');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched shop model data:', data);
      setShopModel({
        gltfUrl: `http://localhost:3000/uploads/shop/${data.gltfFile}`,
      });
    } catch (error) {
      console.error('Error fetching shop model:', error);
      setError('Failed to fetch shop model. Please check your server and try again.');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched products data:', data);
      setProducts(data.map(p => ({
        ...p,
        gltfUrl: `http://localhost:3000/uploads/products/${p.name}/${p.gltfFile}`,
        position: p.position || [0, 0, 0]
      })));
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please check your server and try again.');
    }
  };

  const handleShopUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const response = await fetch('http://localhost:3000/upload-shop', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('Shop upload successful:', data);
      alert('Shop files uploaded successfully');
      fetchShopModel();
    } catch (error) {
      console.error('Shop upload failed:', error);
      alert('Shop upload failed');
    }
  };

  const handleProductUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const response = await fetch('http://localhost:3000/upload-product', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('Product upload successful:', data);
      alert('Product files uploaded successfully');
      fetchProducts();
    } catch (error) {
      console.error('Product upload failed:', error);
      alert('Product upload failed');
    }
  };

  const handleProductSelect = (name) => {
    const product = products.find(p => p.name === name);
    setSelectedProduct(product);
  };

  const updateProductPosition = (newPosition) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.name === selectedProduct.name 
          ? { ...p, position: newPosition } 
          : p
      )
    );
    setSelectedProduct(prev => ({ ...prev, position: newPosition }));
  };

  const saveLayout = async () => {
    await fetch('http://localhost:3000/save-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products)
    });
    alert('Layout saved successfully');
  };

  return (
    <div>
      <h1>Admin Page</h1>
      <h2>Upload Shop Model</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleShopUpload}>
        <div>
          <label htmlFor="shopGltf">GLTF File:</label>
          <input type="file" id="shopGltf" name="shop" accept=".gltf" required />
        </div>
        <div>
          <label htmlFor="shopBin">BIN File:</label>
          <input type="file" id="shopBin" name="shop" accept=".bin" required />
        </div>
        <div>
          <label htmlFor="shopTextures">Texture Files:</label>
          <input type="file" id="shopTextures" name="shopTextures" accept="image/*" multiple />
        </div>
        <button type="submit">Upload Shop Files</button>
      </form>

      <h2>Upload Product</h2>
      <form onSubmit={handleProductUpload}>
        <div>
          <label htmlFor="productName">Product Name:</label>
          <input type="text" id="productName" name="productName" required />
        </div>
        <div>
          <label htmlFor="productGltf">GLTF File:</label>
          <input type="file" id="productGltf" name="product" accept=".gltf" required />
        </div>
        <div>
          <label htmlFor="productBin">BIN File:</label>
          <input type="file" id="productBin" name="product" accept=".bin" required />
        </div>
        <div>
          <label htmlFor="productTextures">Texture Files:</label>
          <input type="file" id="productTextures" name="productTextures" accept="image/*" multiple />
        </div>
        <button type="submit">Upload Product Files</button>
      </form>

      {shopModel ? (
        <div style={{ width: '100%', height: '500px', position: 'relative' }}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            <Sky />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Suspense fallback={null}>
              <Model modelData={shopModel} onModelClick={(part) => console.log('Clicked on shop part:', part)} scale={0.01} position={[0, -1, 0]} />
              {products.map((product, index) => (
                <TransformControls key={`${product.name}-${index}`} position={product.position}>
                  <Model 
                    modelData={product}
                    onModelClick={() => handleProductSelect(product.name)}
                    scale={0.01}
                  />
                </TransformControls>
              ))}
            </Suspense>
            <Environment preset="sunset" background />
          </Canvas>
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', padding: 10 }}>
            <h3>Control Panel</h3>
            {selectedProduct && (
              <>
                <div>
                  X: <input type="number" value={selectedProduct.position[0]} onChange={(e) => updateProductPosition([parseFloat(e.target.value), selectedProduct.position[1], selectedProduct.position[2]])} />
                </div>
                <div>
                  Y: <input type="number" value={selectedProduct.position[1]} onChange={(e) => updateProductPosition([selectedProduct.position[0], parseFloat(e.target.value), selectedProduct.position[2]])} />
                </div>
                <div>
                  Z: <input type="number" value={selectedProduct.position[2]} onChange={(e) => updateProductPosition([selectedProduct.position[0], selectedProduct.position[1], parseFloat(e.target.value)])} />
                </div>
              </>
            )}
          </div>
          <button onClick={saveLayout} style={{ position: 'absolute', bottom: 10, right: 10 }}>
            Save Layout
          </button>
        </div>
      ) : (
        <div>No shop model uploaded yet. Please upload a shop model to view the 3D scene.</div>
      )}
    </div>
  );
}

export default AdminPage;