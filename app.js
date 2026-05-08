const sinkArea = document.getElementById('sink-area');
const rackArea = document.getElementById('rack-area');
const popupOverlay = document.getElementById('popup-overlay');
const popupContent = document.getElementById('popup-content');
const popupBaseDish = document.getElementById('popup-base-dish');
const canvas = document.getElementById('scrub-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const dishesData = [];
let activeDish = null;
let activeData = null;
let isDrawing = false;
let dirtImage = new Image();
dirtImage.src = 'assets_v2/dirt.svg';
let dirtyPixelsTotal = 0;
let isCleared = false;
let isGameCleared = false;
let spawnerInterval;

function init() {
  createWaterBubbles();
  
  const numDishes = Math.floor(Math.random() * 3) + 5; // 5 to 7 dishes
  
  for(let i=0; i<numDishes; i++) {
    spawnSingleDish(i);
  }

  spawnerInterval = setInterval(() => {
    if (isGameCleared) return;
    spawnSingleDish(Date.now());
  }, 15000);
}

function spawnSingleDish(id) {
  const types = ['bowl', 'mug', 'spoon', 'fork', 'plate', 'pan', 'glass'];
  const type = types[Math.floor(Math.random() * types.length)];
  const x = 5 + Math.random() * 80; // 5% to 85%
  const y = 5 + Math.random() * 80; // 5% to 85%
  const rotation = Math.random() * 360;
  
  const data = { id, type, x, y };
  dishesData.push(data);
  
  const dishWrapper = document.createElement('div');
  dishWrapper.className = `dish in-sink type-${type}`;
  dishWrapper.style.left = `${x}%`;
  dishWrapper.style.top = `${y}%`;
  dishWrapper.style.setProperty('--rot', `${rotation}deg`);
  dishWrapper.dataset.id = id;
  
  const dirtLayer = document.createElement('div');
  dirtLayer.className = 'layer-dirty';
  dishWrapper.appendChild(dirtLayer);

  dishWrapper.addEventListener('click', () => openPopup(dishWrapper, data));
  sinkArea.appendChild(dishWrapper);
}

function createWaterBubbles() {
  const waterLayer = document.getElementById('water-layer');
  for(let i=0; i<20; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'water-bubble';
    bubble.style.width = bubble.style.height = `${10 + Math.random() * 20}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDuration = `${4 + Math.random() * 5}s`;
    bubble.style.animationDelay = `${Math.random() * 5}s`;
    waterLayer.appendChild(bubble);
  }
}

function openPopup(dishElement, data) {
  if (dishElement.classList.contains('clean')) return;
  
  activeDish = dishElement;
  activeData = data;
  isCleared = false;
  popupOverlay.classList.remove('hidden');
  
  popupContent.className = `popup-${data.type}`;
  popupBaseDish.style.backgroundImage = `url('assets_v2/${data.type}.svg')`;
  
  // Wait for layout
  setTimeout(() => {
    setupCanvas();
  }, 50);
}

function setupCanvas() {
  canvas.width = popupContent.clientWidth;
  canvas.height = popupContent.clientHeight;
  
  const pattern = ctx.createPattern(dirtImage, 'repeat');
  const maskImg = new Image();
  maskImg.src = `assets_v2/${activeData.type}.svg`;
  
  maskImg.onload = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    dirtyPixelsTotal = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 10) dirtyPixelsTotal++;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 60;
    ctx.globalCompositeOperation = 'destination-out';
  };
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let clientX = e.clientX;
  let clientY = e.clientY;
  if(e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrawing(e) {
  if (isCleared) return;
  isDrawing = true;
  const pos = getMousePos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  spawnScrubBubble(pos);
  if (e.cancelable) e.preventDefault();
}

function draw(e) {
  if (!isDrawing || isCleared) return;
  const pos = getMousePos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  spawnScrubBubble(pos);
  checkClearProgress();
  if (e.cancelable) e.preventDefault();
}

function stopDrawing(e) {
  isDrawing = false;
  ctx.closePath();
  if (e && e.cancelable) {
    e.preventDefault();
  }
}

let lastBubble = 0;
function spawnScrubBubble(pos) {
  const now = Date.now();
  if (now - lastBubble < 50 || Math.random() > 0.3) return;
  lastBubble = now;
  const b = document.createElement('div');
  b.className = 'scrub-bubble';
  b.style.left = `${pos.x + (Math.random() * 40 - 20)}px`;
  b.style.top = `${pos.y + (Math.random() * 40 - 20)}px`;
  popupContent.appendChild(b);
  setTimeout(() => b.remove(), 500);
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, {passive: false});
canvas.addEventListener('touchmove', draw, {passive: false});
canvas.addEventListener('touchend', stopDrawing, {passive: false});

let lastCheck = 0;
function checkClearProgress() {
  const now = Date.now();
  if (now - lastCheck < 200) return;
  lastCheck = now;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let currentDirty = 0;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 10) currentDirty++;
  }
  
  if (dirtyPixelsTotal === 0) dirtyPixelsTotal = 1;
  
  const clearedRatio = 1 - (currentDirty / dirtyPixelsTotal);
  
  if (clearedRatio > 0.90) {
    isCleared = true;
    isDrawing = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    triggerParticles();
    
    activeDish.classList.add('clean');
    activeDish.classList.remove('in-sink');
    popupBaseDish.style.backgroundImage = `url('assets_v2/${activeData.type}_happy.svg')`;
    
    setTimeout(() => {
      popupOverlay.classList.add('hidden');
      moveToRack(activeDish);
      checkGameClear();
    }, 1000);
  }
}

function triggerParticles() {
  const rect = popupContent.getBoundingClientRect();
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = (rect.width / 2) + 'px';
    p.style.top = (rect.height / 2) + 'px';
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 200;
    p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    
    popupContent.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function moveToRack(dish) {
  sinkArea.removeChild(dish);
  rackArea.appendChild(dish);
  
  dish.style.transform = `rotate(${Math.random() * 30 - 15}deg)`;
  dish.style.left = `${10 + Math.random() * 60}%`;
  dish.style.top = `${20 + Math.random() * 60}%`;
  
  dish.style.pointerEvents = 'none';
}

function checkGameClear() {
  if (sinkArea.children.length === 0) {
    isGameCleared = true;
    clearInterval(spawnerInterval);
    setTimeout(() => {
      document.getElementById('clear-message').classList.remove('hidden');
    }, 1000);
  }
}

window.onload = () => {
  if (dirtImage.complete) {
    init();
  } else {
    dirtImage.onload = () => {
      init();
    };
  }
};
