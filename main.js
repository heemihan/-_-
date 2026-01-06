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

// 벽 생성
const wallOptions = { isStatic: true, render: { visible: false } };
const ground = Bodies.rectangle(200, 595, 400, 10, wallOptions);
const leftWall = Bodies.rectangle(40, 300, 10, 600, wallOptions);
const rightWall = Bodies.rectangle(360, 300, 10, 600, wallOptions);
const topSensorY = 100; 

Composite.add(world, [ground, leftWall, rightWall]);

// 데이터 및 상태 변수
const FRUITS = [
    { radius: 19, score: 2 }, { radius: 29, score: 4 }, { radius: 44, score: 8 },
    { radius: 54, score: 16 }, { radius: 69, score: 32 }, { radius: 84, score: 64 },
    { radius: 99, score: 128 }, { radius: 119, score: 256 }, { radius: 139, score: 512 },
    { radius: 159, score: 1024 }, { radius: 189, score: 2048 }
];

// 상태 변수 

let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = false;
let isDragging = false; 


// 과일 생성 함수
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

function spawnFruit() {
    if (isGameOver) return;
    canDrop = true;
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
}

// 효과음 및 유틸리티
function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function getInputX(e) {
    const rect = container.getBoundingClientRect();
    let clientX;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }
    return clientX - rect.left;
}
container.style.touchAction = 'none';

// 6. 조작 로직 (Pointer Event 활용)

function handleMove(e) {
    if (isDragging && currentFruit && !isGameOver) {
        let x = getInputX(e);
        const level = parseInt(currentFruit.label.split('_')[1]);
        const radius = FRUITS[level - 1].radius;
        
        // 벽 안쪽 제한 (40px ~ 360px 사이)
        x = Math.max(40 + radius, Math.min(360 - radius, x));
        
        // 드래그 중에는 y 좌표를 고정하고 x만 이동
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
}

function handleStart(e) {
    if (e.target.id === 'reset-btn' || isGameOver || !canDrop || !currentFruit) return;
    isDragging = true;
    handleMove(e);
}

function handleEnd(e) {
    if (isDragging && currentFruit) {
        isDragging = false;
        canDrop = false; 
    
        Body.setStatic(currentFruit, false);
        playSound('sound-drop');

        currentFruit = null;
        
        setTimeout(spawnFruit, 1000); 
    }
}

// 7. 이벤트 리스너 통합 관리 (Pointer Events)
container.style.touchAction = 'none'; 
container.addEventListener('pointerdown', (e) => {
    container.setPointerCapture(e.pointerId);
    handleStart(e);
});

window.addEventListener('pointermove', handleMove);

window.addEventListener('pointerup', (e) => {
    if (container.hasPointerCapture(e.pointerId)) {
        container.releasePointerCapture(e.pointerId);
    }
    handleEnd(e);
});

// 충돌 및 게임오버 로직 
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label && bodyB.label && bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            if (bodyA.isMerging || bodyB.isMerging) return;
            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < 11) {
                bodyA.isMerging = true; bodyB.isMerging = true;
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;
                playSound('sound-merge');
                Composite.remove(world, [bodyA, bodyB]);
                Composite.add(world, createFruit(midX, midY, level + 1));
                score += FRUITS[level - 1].score;
                document.getElementById('score').innerText = score;
            }
        }
    });
});

Events.on(engine, 'afterUpdate', () => {
    if (isGameOver) return;
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_') && !b.isStatic);
    for (let fruit of fruits) {
        if (fruit.position.y < topSensorY && Math.abs(fruit.velocity.y) < 0.2) {
            isGameOver = true;
            playSound('sound-gameover');
            document.getElementById('game-over').style.display = 'block';
            document.getElementById('final-score').innerText = score;
        }
    }
});

Render.run(render);
Runner.run(Runner.create(), engine);
spawnFruit();

window.resetGame = function() { location.reload(); }
