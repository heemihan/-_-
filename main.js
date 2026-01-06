const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;
const container = document.getElementById('game-container');

// 상태 변수 관리
let currentSkinType = 'A'; // 'A' 또는 'B'
const mergeQueue = []; // 충돌 큐 선언 (필수!)
let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = true;
let isDragging = false;

const FRUITS = [
    { radius: 17.5, score: 2 }, { radius: 27.5, score: 4 }, { radius: 42.5, score: 8 },
    { radius: 52.5, score: 16 }, { radius: 67.5, score: 32 }, { radius: 82.5, score: 64 },
    { radius: 97.5, score: 128 }, { radius: 117.5, score: 256 }, { radius: 137.5, score: 512 },
    { radius: 157.5, score: 1024 }, { radius: 187.5, score: 2048 }
];

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

// 3. 유틸리티 함수
function getInputX(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clientX - rect.left;
}

// 4. 캐릭터 생성 함수 (하나로 통합)
function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    const indexStr = String(level - 1).padStart(2, '0'); 
    const prefix = (currentSkinType === 'A') ? 'fruit' : 'skinB_fruit';
    const texturePath = `asset/${prefix}${indexStr}.png`; 

    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic,
        restitution: 0.3,
        render: {
            sprite: {
                texture: texturePath,
                xScale: 1,
                yScale: 1
            }
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

// 5. 스킨 전환 함수 (통합 및 즉시 반영)
window.toggleSkin = function() {
    currentSkinType = (currentSkinType === 'A') ? 'B' : 'A';
    const prefix = (currentSkinType === 'A') ? 'fruit' : 'skinB_fruit';
    
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_'));
    fruits.forEach(fruit => {
        const level = parseInt(fruit.label.split('_')[1]);
        const indexStr = String(level - 1).padStart(2, '0');
        fruit.render.sprite.texture = `asset/${prefix}${indexStr}.png`;
    });

    if (currentFruit) {
        const level = parseInt(currentFruit.label.split('_')[1]);
        const indexStr = String(level - 1).padStart(2, '0');
        currentFruit.render.sprite.texture = `asset/${prefix}${indexStr}.png`;
    }
};

// 6. 조작 로직 (마우스/터치 통합 권장)
window.addEventListener('mousedown', (e) => { if(canDrop) isDragging = true; });
window.addEventListener('mousemove', (e) => {
    if (isDragging && currentFruit && !isGameOver) {
        let x = getInputX(e);
        const level = parseInt(currentFruit.label.split('_')[1]);
        const radius = FRUITS[level - 1].radius;
        x = Math.max(40 + radius, Math.min(360 - radius, x));
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
});
window.addEventListener('mouseup', () => {
    if (isDragging && currentFruit) {
        isDragging = false;
        canDrop = false;
        Body.setStatic(currentFruit, false);
        currentFruit = null;
        setTimeout(spawnFruit, 1000);
    }
});

// 7. 충돌 및 게임 로직
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label && bodyB.label && bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            if (bodyA.isMerging || bodyB.isMerging) return;
            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < 11) {
                bodyA.isMerging = true;
                bodyB.isMerging = true;
                mergeQueue.push({
                    bodyA, bodyB, level,
                    x: (bodyA.position.x + bodyB.position.x) / 2,
                    y: (bodyA.position.y + bodyB.position.y) / 2
                });
            }
        }
    });
});

Events.on(engine, 'afterUpdate', () => {
    // 합성 처리
    while (mergeQueue.length > 0) {
        const data = mergeQueue.shift();
        const { bodyA, bodyB, level, x, y } = data;
        if (Composite.allBodies(world).includes(bodyA) && Composite.allBodies(world).includes(bodyB)) {
            Composite.remove(world, [bodyA, bodyB]);
            const newFruit = createFruit(x, y, level + 1);
            Composite.add(world, newFruit);
            score += FRUITS[level - 1].score;
            document.getElementById('score').innerText = score;
        }
    }

    // 게임오버 체크
    if (isGameOver) return;
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_') && !b.isStatic);
    for (let fruit of fruits) {
        if (fruit.position.y < topSensorY && Math.abs(fruit.velocity.y) < 0.2) {
            isGameOver = true;
            document.getElementById('game-over').style.display = 'block';
        }
    }
});

// 리셋 함수
window.resetGame = function() {
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_'));
    Composite.remove(world, fruits);
    score = 0;
    isGameOver = false;
    document.getElementById('score').innerText = '0';
    document.getElementById('game-over').style.display = 'none';
    spawnFruit();
}

// 실행
Render.run(render);
const runner = Runner.create({ isFixed: true });
Runner.run(runner, engine);
spawnFruit();
