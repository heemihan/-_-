const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;
const container = document.getElementById('game-container');

// 1. 렌더러 설정
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

// 2. 벽 생성
const wallOptions = { isStatic: true, render: { visible: false } };
const ground = Bodies.rectangle(200, 595, 400, 10, wallOptions);
const leftWall = Bodies.rectangle(40, 300, 10, 600, wallOptions);
const rightWall = Bodies.rectangle(360, 300, 10, 600, wallOptions);
const topSensorY = 100; 

Composite.add(world, [ground, leftWall, rightWall]);

// 3. 데이터 및 상태 변수
const FRUITS = [
    { radius: 20, score: 2 }, { radius: 30, score: 4 }, { radius: 45, score: 8 },
    { radius: 55, score: 16 }, { radius: 70, score: 32 }, { radius: 85, score: 64 },
    { radius: 100, score: 128 }, { radius: 120, score: 256 }, { radius: 140, score: 512 },
    { radius: 160, score: 1024 }, { radius: 190, score: 2048 }
];

let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = true;
let isDragging = false; // 드래그 상태 확인용

// 4. 과일 생성 함수
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
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
    canDrop = true;
}

// 5. 효과음 및 유틸리티 함수
function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function getInputX(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clientX - rect.left;
}

// 6. 조작 로직 (터치 유지 시 이동, 떼면 낙하)
function handleMove(e) {
    if (isDragging && currentFruit && !isGameOver) {
        let x = getInputX(e);
        const level = parseInt(currentFruit.label.split('_')[1]);
        const radius = FRUITS[level - 1].radius;
        // 좌우 벽 안쪽으로만 움직이게 제한
        x = Math.max(40 + radius, Math.min(360 - radius, x));
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
}

function handleStart(e) {
    if (e.target.id === 'reset-btn' || isGameOver || !canDrop) return;
    isDragging = true;
    handleMove(e); // 터치한 위치로 즉시 이동
}

function handleEnd() {
    if (isDragging && currentFruit && !isGameOver) {
        isDragging = false;
        canDrop = false;
        Body.setStatic(currentFruit, false);
        playSound('sound-drop'); // 효과음
        currentFruit = null;
        setTimeout(spawnFruit, 1000);
    }
}

// 이벤트 리스너 등록 (마우스/터치 통합)
container.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

container.addEventListener('touchstart', (e) => {
    if (e.target.id !== 'reset-btn') {
        if (e.cancelable) e.preventDefault();
        handleStart(e);
    }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
    handleMove(e);
}, { passive: false });

container.addEventListener('touchend', handleEnd);

// 7. 리셋 함수
window.resetGame = function() {
    location.reload(); // 가장 깔끔한 리셋 방법
}

// 8. 충돌(합성) 로직
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

// 9. 게임오버 체크
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

// 실행
Render.run(render);
Runner.run(Runner.create(), engine);
spawnFruit();
