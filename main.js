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

// 과일 생성 함수 (중괄호 문제 수정됨)
function spawnFruit() {
    if (isGameOver) return;
    
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
    
    canDrop = false;
    setTimeout(() => {
        canDrop = true;
    }, 200); // 생성 직후 오작동 방지를 위해 약간의 대기 시간 부여
}

function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function getInputX(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    return clientX - rect.left;
}

// 조작 로직
function handleStart(e) {
    if (isGameOver || !canDrop || !currentFruit) return;
    isDragging = true;
    handleMove(e);
}

function handleMove(e) {
    if (!isDragging || !currentFruit || isGameOver) return;

    let x = getInputX(e);
    const level = parseInt(currentFruit.label.split('_')[1]);
    const radius = FRUITS[level - 1].radius;
    
    x = Math.max(40 + radius, Math.min(360 - radius, x));
    Body.setPosition(currentFruit, { x: x, y: 80 });
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

// 이벤트 리스너 (spawnFruit 밖으로 분리)
container.style.touchAction = 'none'; 
container.onpointerdown = handleStart;
window.onpointermove = handleMove;
window.onpointerup = handleEnd;

// 충돌 로직
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label && bodyB.label && bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            if (bodyA.isMerging || bodyB.isMerging) return;
            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < 11) {
                bodyA.isMerging = true; 
                bodyB.isMerging = true;
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
