const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;
const container = document.getElementById('game-container');
const outer = document.getElementById('game-outer');

// 게임 설정 및 상태 변수
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
let currentSkinType = 'A'; // 'A' 또는 'B'
const mergeQueue = []; 
let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = true;

const FRUITS = [
    { radius: 17.5, score: 2 }, { radius: 27.5, score: 4 }, { radius: 42.5, score: 8 },
    { radius: 52.5, score: 16 }, { radius: 67.5, score: 32 }, { radius: 82.5, score: 64 },
    { radius: 97.5, score: 128 }, { radius: 117.5, score: 256 }, { radius: 137.5, score: 512 },
    { radius: 157.5, score: 1024 }, { radius: 187.5, score: 2048 }
];

// 1. 렌더러 설정 (캔버스 크기 고정 및 배경 설정)
const render = Render.create({
    element: container,
    engine: engine,
    options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: 'asset/background.png'
    }
});

// 2. 벽 생성 (화면 밖으로 배치하여 캐릭터가 끼지 않게 함)
const wallOptions = { isStatic: true, render: { visible: false } };
Composite.add(world, [
    Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 15, GAME_WIDTH, 30, wallOptions), // 바닥
    Bodies.rectangle(-15, GAME_HEIGHT / 2, 30, GAME_HEIGHT, wallOptions),           // 왼쪽
    Bodies.rectangle(GAME_WIDTH + 15, GAME_HEIGHT / 2, 30, GAME_HEIGHT, wallOptions) // 오른쪽
]);

// 3. 캐릭터 생성 함수
function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    const indexStr = String(level - 1).padStart(2, '0'); 
    const prefix = (currentSkinType === 'A') ? 'fruit' : 'skinB_fruit';
    
    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic,
        restitution: 0.3,
        render: {
            sprite: {
                texture: `asset/${prefix}${indexStr}.png`,
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
    currentFruit = createFruit(GAME_WIDTH / 2, 80, level, true);
    Composite.add(world, currentFruit);
    canDrop = true;
}

// 4. 조작 로직 (마우스/터치 이동 및 낙하)
const handleMove = (e) => {
    if (currentFruit && canDrop && !isGameOver) {
        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        
        // 실제 캔버스 내부 좌표 계산
        let x = clientX - rect.left;
        
        const level = parseInt(currentFruit.label.split('_')[1]);
        const radius = FRUITS[level - 1].radius;
        
        // 벽 뚫기 방지 제한
        x = Math.max(radius, Math.min(GAME_WIDTH - radius, x));
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
};

outer.addEventListener('mousemove', handleMove);
outer.addEventListener('touchmove', handleMove);

outer.addEventListener('mousedown', (e) => {
    // 버튼 클릭 시 낙하 방지
    if (e.target.tagName === 'IMG' || e.target.tagName === 'BUTTON') return;
    
    if (currentFruit && canDrop && !isGameOver) {
        canDrop = false;
        Body.setStatic(currentFruit, false);
        currentFruit = null;
        setTimeout(spawnFruit, 1000);
    }
});

// 5. 물리 엔진 이벤트 (충돌 및 합성)
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === bodyB.label && bodyA.label.startsWith('fruit_')) {
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
        const { bodyA, bodyB, level, x, y } = mergeQueue.shift();
        if (Composite.allBodies(world).includes(bodyA) && Composite.allBodies(world).includes(bodyB)) {
            Composite.remove(world, [bodyA, bodyB]);
            Composite.add(world, createFruit(x, y, level + 1));
            score += FRUITS[level - 1].score;
            document.getElementById('score').innerText = score;
        }
    }

    // 게임오버 체크
    if (isGameOver) return;
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_') && !b.isStatic);
    for (let fruit of fruits) {
        if (fruit.position.y < 100 && Math.abs(fruit.velocity.y) < 0.2) {
            isGameOver = true;
            document.getElementById('game-over').style.display = 'flex';
            document.getElementById('final-score').innerText = score;
        }
    }
});

// 6. 스킨 및 리셋 기능
window.toggleSkin = function() {
    currentSkinType = (currentSkinType === 'A') ? 'B' : 'A';
    const prefix = (currentSkinType === 'A') ? 'fruit' : 'skinB_fruit';
    
    // 이미 존재하는 과일들 이미지 교체
    Composite.allBodies(world).forEach(body => {
        if (body.label && body.label.startsWith('fruit_')) {
            const level = body.label.split('_')[1];
            body.render.sprite.texture = `asset/${prefix}${String(level - 1).padStart(2, '0')}.png`;
        }
    });

    // 조준 중인 과일 이미지 교체
    if (currentFruit) {
        const level = currentFruit.label.split('_')[1];
        currentFruit.render.sprite.texture = `asset/${prefix}${String(level - 1).padStart(2, '0')}.png`;
    }
};

window.resetGame = () => location.reload();

// 실행
Render.run(render);
Runner.run(Runner.create({ isFixed: true }), engine);
spawnFruit();
