import React, { useEffect, useRef, useState } from 'react';
import '../styles/hexgrid.css';

export default function HexGrid({ width, height, items, onHexClick, renderHexContent, className = '', style = {}, selectedId }) {
  const scrollContainerRef = useRef(null);
  const gridRef = useRef(null);
  const [zoomingHexId, setZoomingHexId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0 });
  const [gridZooming, setGridZooming] = useState(false);
  const [scale, setScale] = useState(1);
  const [showRegionNames, setShowRegionNames] = useState(true);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 2.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.4));

  // Centering helper
  const centerOnElement = (el) => {
    const container = scrollContainerRef.current;
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offsetLeft = (elRect.left + elRect.right) / 2 - containerRect.left - container.clientWidth / 2 + container.scrollLeft;
    const offsetTop = (elRect.top + elRect.bottom) / 2 - containerRect.top - container.clientHeight / 2 + container.scrollTop;
    container.scrollTo({ left: offsetLeft, top: offsetTop, behavior: 'smooth' });
  };

  // When selectedId changes, center on it
  useEffect(() => {
    if (!selectedId) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    // find element by data-id
    const el = container.querySelector(`[data-hexid="${selectedId}"]`);
    if (el) centerOnElement(el);
  }, [selectedId]);

  // Drag handlers for panning
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onDown = (e) => {
      setIsDragging(true);
      container.classList.add('dragging');
      dragState.current.startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      dragState.current.startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      dragState.current.startScrollLeft = container.scrollLeft;
      dragState.current.startScrollTop = container.scrollTop;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = cx - dragState.current.startX;
      const dy = cy - dragState.current.startY;
      container.scrollLeft = dragState.current.startScrollLeft - dx;
      container.scrollTop = dragState.current.startScrollTop - dy;
    };

    const onUp = () => {
      setIsDragging(false);
      container.classList.remove('dragging');
    };

    container.addEventListener('mousedown', onDown);
    container.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    return () => {
      container.removeEventListener('mousedown', onDown);
      container.removeEventListener('touchstart', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging]);

  const handleHexClick = (item, ev) => {
    if (item.empty) return;

    const container = scrollContainerRef.current;
    const el = ev.currentTarget;

    // First center on the hex
    centerOnElement(el);

    // If owned, perform smooth grid zoom toward that hex
    if (item.owned) {
      if (gridRef.current && container) {
        // compute origin relative to grid element
        const gridRect = gridRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const originX = (elRect.left + elRect.right) / 2 - gridRect.left;
        const originY = (elRect.top + elRect.bottom) / 2 - gridRect.top;
        gridRef.current.style.transformOrigin = `${originX}px ${originY}px`;
        setGridZooming(true);
      }
      // delay to allow zoom animation then trigger view
      setTimeout(() => {
        if (onHexClick) onHexClick(item);
        // reset zoom state shortly after
        setTimeout(() => setGridZooming(false), 300);
      }, 700);
    } else {
      // non-owned behavior: just center and open claim UI
      if (onHexClick) onHexClick(item);
    }
  };

  // Standard Axial to Pixel conversion for Pointy-Topped Hexagons
  const getHexPos = (q, r, size) => {
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * (3 / 2) * r;
    return { x, y };
  };

  const hexSizeVar = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hex-size')) || 130;
  const size = hexSizeVar / 2;
  const hexWidth = Math.sqrt(3) * size;
  const hexHeight = hexSizeVar;

  // Calculate bounds to center the grid
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const positionedItems = items.map(item => {
    const q = typeof item.q !== 'undefined' ? item.q : (item.x - Math.floor(item.y / 2));
    const r = typeof item.r !== 'undefined' ? item.r : item.y;
    const pos = getHexPos(q, r, size);
    if (!item.empty) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
    }
    return { ...item, q, r, ...pos };
  });

  const gridWidth = (maxX - minX) + hexWidth + 200;
  const gridHeight = (maxY - minY) + hexHeight + 200;
  const offsetX = -minX + 100;
  const offsetY = -minY + 100;

  return (
    <div className={`hex-grid-wrapper`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Zoom & View Controls - Fixed relative to wrapper */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In">
          <i className="fa-solid fa-plus"></i>
        </button>
        <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out">
          <i className="fa-solid fa-minus"></i>
        </button>

        {/* Region Name Toggle Slider */}
        <div className="toggle-container">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={showRegionNames} 
              onChange={() => setShowRegionNames(!showRegionNames)}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label font-cinzel" style={{ color: '#e0cda0', marginLeft: '8px', fontWeight: 'bold' }}>Names</span>
        </div>
      </div>

      <div className={`hex-grid-container ${className}`} style={style} ref={scrollContainerRef}>
        <div 
            ref={gridRef} 
            className={`hex-grid ${className} ${gridZooming ? 'grid-zooming' : ''}`} 
            style={{ 
                width: gridWidth, 
                height: gridHeight,
                position: 'relative',
                transform: gridZooming ? undefined : `scale(${scale})`,
                transformOrigin: 'center center'
            }}
        >
          {positionedItems.map((item, idx) => {
            const isSelected = item.id === selectedId;
            const isZooming = item.id === zoomingHexId;
            const terrainClass = item.terrain ? item.terrain.toLowerCase() : 'plains';
            const rotation = item.rotation || 0;
            const isHidden = item.empty;

            return (
              <div 
                key={item.id || idx} 
                data-hexid={item.id}
                className={`hex ${isHidden ? 'hidden-tile' : terrainClass} ${item.owned ? 'owned' : ''} ${item.allied ? 'allied' : ''} ${item.enemy ? 'enemy' : ''} ${isZooming ? 'zooming' : ''} ${isSelected ? 'selected' : ''} ${item.isRegionCenter ? 'region-center' : ''}`}
                onClick={(ev) => handleHexClick(item, ev)}
                style={{ 
                  position: 'absolute',
                  left: item.x + offsetX,
                  top: item.y + offsetY,
                  transform: `rotate(${rotation}deg)`,
                  opacity: isHidden ? 0 : 1, 
                  pointerEvents: isHidden ? 'none' : 'auto',
                  width: hexWidth,
                  height: hexHeight
                }}
              >
                <div className="hex-layer-base"></div>
                <div className="hex-layer-top" style={{ backgroundColor: item.regionColor || undefined }}></div>
                <div className="hex-content" style={{ transform: `rotate(${-rotation}deg)` }}>
                  {renderHexContent && !isHidden ? renderHexContent(item) : null}
                </div>
              </div>
            );
          })}

          {/* Floating Labels Layer - Rendered after all hexes to ensure they are on top */}
          {showRegionNames && positionedItems.filter(item => item.regionLabel).map((item, idx) => {
            // Stagger labels vertically to prevent overlap between adjacent regions
            const staggerOffsets = ['-180%', '-120%', '-60%'];
            const translateY = staggerOffsets[idx % staggerOffsets.length];
            
            return (
              <div 
                key={`label-${item.id || idx}`}
                style={{
                  position: 'absolute',
                  left: item.x + offsetX + (hexWidth / 2),
                  top: item.y + offsetY + (hexHeight / 2),
                  transform: `translate(-50%, ${translateY})`,
                  zIndex: 2000,
                  pointerEvents: 'none',
                  width: 600,
                  textAlign: 'center',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: '#fff', /* Changed from dark brown to white for better contrast */
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  /* Stronger, darker shadow to make the white text pop against any background */
                  textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)'
                }}
              >
                {item.regionLabel}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
