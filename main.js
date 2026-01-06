const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;
const container = document.getElementById('game-container');

const render = Render.create({
    element: container,
    engine: engine,
    options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: 'transparent'
    }
});

// 벽 및 설정
const wallOptions = { isStatic: true, render: { visible: false } };
const ground = Bodies.rectangle(200, 595, 400, 10, wallOptions);
const leftWall = Bodies.rectangle(40, 300, 10, 600, wallOptions);
const rightWall = Bodies.rectangle(360, 300, 10, 600, wallOptions);
const topSensorY = 100; 

Composite.add(world, [ground, leftWall, rightWall]);

const FRUITS = [
    { radius: 19, score: 2 }, { radius: 29, score: 4 }, { radius: 44, score: 8 },
    { radius: 54, score: 16 }, { radius: 69, score: 32 }, { radius: 84, score: 64 },
    { radius: 99, score: 128 }, { radius: 119, score: 256 }, { radius: 139, score: 512 },
    { radius: 159, score: 1024 }, { radius: 189, score: 2048 }
];

let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = false;
let isDragging = false;

function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    const indexStr = String(level - 1).padStart(2, '0');
    const texturePath = `asset/fruit${indexStr}.png`; 

    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic, 
        restitution: 0.3,
        render: {
            sprite: { texture: texturePath, xScale: 1, yScale: 1 }
        }
    });
    fruit.isMerging = false;
    return fruit;
}

// 1. 과일 생성 함수 (안정성 강화)
function spawnFruit() {
    if (isGameOver) return;
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true); 
    Composite.add(world, currentFruit);
    
    canDrop = false;
    setTimeout(() => { canDrop = true; }, 300);
}

function getInputX(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    return clientX - rect.left;
}

// 2. 조작 로직 (상태 엄격 관리)
const handleStart = (e) => {
    if (isGameOver || !canDrop || !currentFruit) return;
    isDragging = true;
    handleMove(e);
};

const handleMove = (e) => {
    if (isDragging && currentFruit && !isGameOver) {
        let x = getInputX(e);
        const level = parseInt(currentFruit.label.split('_')[1]);
        const radius = FRUITS[level - 1].radius;
       // 벽 제한 (40~360 사이)
        x = Math.max(40 + radius, Math.min(360 - radius, x));
    
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
};

const handleEnd = (e) => {
    if (isDragging && currentFruit && canDrop) {
        isDragging = false;
        canDrop = false;
        Body.setStatic(currentFruit, false); 
        currentFruit = null;
        setTimeout(spawnFruit, 1000);
    }
};

// 3. 이벤트 리스너 등록 (가장 중요: 중복 방지 및 캡처)
container.style.touchAction = 'none'; 

// 마우스/터치 통합 리스너
container.onpointerdown = handleStart;
window.onpointermove = handleMove; 
window.onpointerup = handleEnd; 
container.onpointercancel = handleEnd; 

// 4. 충돌 및 유틸리티 (기존과 동일)
function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
}

Events.on(engine, 'beforeUpdate', () => {
    if (isDragging && currentFruit) {
        const currentX = currentFruit.position.x;
        const newX = currentX + (targetX - currentX) * 0.2; 
        
        Body.setPosition(currentFruit, { x: newX, y: 80 });
        Body.setVelocity(currentFruit, { x: 0, y: 0 });
    }
});

const handleEnd = (e) => {
    if (isDragging && currentFruit && canDrop) {
        isDragging = false;
        canDrop = false;

        Body.setStatic(currentFruit, false);
        Body.setVelocity(currentFruit, { x: 0, y: 0 });
        Body.setAngularVelocity(currentFruit, 0);
        
        currentFruit = null;
        setTimeout(spawnFruit, 1000);
    }
};

Events.on(engine, 'afterUpdate', () => {
    if (isGameOver) return;
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_') && !b.isStatic);
    for (let fruit of fruits) {
        if (fruit.position.y < topSensorY && Math.abs(fruit.velocity.y) < 0.2) {
            isGameOver = true;
            playSound('sound-gameover');
            document.getElementById('game-over').style.display = 'block';
        }
    }
});

Render.run(render);
Runner.run(Runner.create(), engine);
spawnFruit();
window.resetGame = function() { location.reload(); }
